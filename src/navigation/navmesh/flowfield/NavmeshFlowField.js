import { Vector3 } from '../../../math/Vector3.js';
import { FlowTriangulate, USE_HANDEDNESS } from './FlowTriangulate.js';
import { FlowVertex } from './FlowVertex.js';
import { isNull } from 'util';

const CALC_VEC = new Vector3();
const CALC_VEC2 = new Vector3();
const CALC_VEC3 = new Vector3();
const LARGEST_NUM = 999999999;

//a = new FlowVertex(this.curRegion.edge.vertex);
//b = new FlowVertex(this.curRegion.edge.next.vertex);
//c = new FlowVertex(this.curRegion.edge.prev.vertex);

/**
 * Gridless flowfield on navmesh generation
 * https://gingkoapp.com/how-to-gridless-rts
 */

class NavMeshFlowField {
	constructor(navMesh) {
		this.navMesh = navMesh;

		this._flowedFinal = false;
	}

	static cacheRegionIndexLookup(navMesh) {
		if (!navMesh.regionIndexMap) {
			navMesh.regionIndexMap = new Map();
			var len = navMesh.regions.length;
			for (var i=0; i<len; i++) {
				navMesh.regionIndexMap.set(navMesh.regions[i], i);
			}
			navMesh.getNodeIndex = NavMeshFlowField.getCachedNodeIndexForRegionProto;
		}
	}

	static getCachedNodeIndexForRegionProto(region) {
		return this.regionIndexMap.has(region) ? this.regionIndexMap.get(region) : -1;
	}

	/**
	 * Init persistant flowfield for leading up to a specific final  destination node, or for a single fixed path
	 * @param {[Node]|(Dijkstra|Map)} pathRef	Result from getPath(), or pre-searched to destination Dijkstra result cost map
	 */
	initPersistant(pathRef) {
		this.edgeFieldMap = new Map();	// <Edge (of portal), [vec1, vec2]>
		this.triangulationMap = new Map();	// <Edge (of portal?|region), FlowTriangulate>
		this.savedRegionFlows = new Map();
		this.pathRef = pathRef;
	}

	resetPersistant(pathRef) {
		this.edgeFieldMap.clear();
		this.triangulationMap.clear();
		this.savedRegionFlows.clear();
		this.pathRef = pathRef;
	}

	initTransitional(fromNode, node, pathRef) {
		this.edgeFieldMap = new Map();	// <Edge (of portal), [vec1, vec2]>
		this.triangulationMap = null;
		this.savedRegionFlows = null;
		this.pathRef = null;

		this.calcRegionFlow(fromNode, node, pathRef);
		return "";	// return string-based key for external LRU cache storage
	}

	/**
	 *
	 * @param {Number} node	Node index to start from
	 * @param {[Node]|(Dijkstra)} pathRef	Result from getPath(), or pre-searched to destination Dijkstra with .source as the final destination and .destination as -1
	 * @param {BooleanD} getAll Always get all flow edges until reach end of path
	 * @return [Number] All portal edges that comprise of the necesary regions to be able to help calculate flowfield from given node (as if starting from that node).
	 *  If no path can be found from given node, returns null.
	 */
	getFlowEdges(node, pathRef, getAll) {
		let resultArr = [];
		let n;
		let tryNode;
		let tryEdge;
		let firstEdge = null;

		this._flowedFinal = false;	// for test-debugging purposes

		if (!Array.isArray(pathRef)) { // Dijkstra assumed pre-searched (ie. source is fill "destination")
			// iterate through all regions to find lowest costs
			let costs = pathRef._cost;
			let tryCost = LARGEST_NUM;
			n = node;
			if (node === pathRef.source) {
				this._flowedFinal = true;
				return resultArr;
			}

			while(n !== null) {
				let edges = this.navMesh.graph._edges.get( n );
				let len = edges.length;


				tryNode = null;


				for (let i=0; i<len; i++) {

					let toN = edges[i].to;
					if (toN === pathRef.source) {
						tryNode = toN;
						break;
					}
					if (costs.has(toN) && costs.get(toN) < tryCost) {
						tryCost = costs.get(toN);
						tryNode = toN;
					}
				}

				if (tryNode !== null) {
					tryEdge = this.navMesh.regions[n].getEdgeTo(this.navMesh.regions[tryNode]);
					if (firstEdge !== null) {
						resultArr.push(tryEdge);
						n = tryEdge.vertex === firstEdge.vertex || tryEdge.prev.vertex === firstEdge.prev.vertex ? tryNode : null;

						if (getAll) n = tryNode;

					} else {
						firstEdge = tryEdge;
						resultArr.push(tryEdge);
						n = tryNode;
					}

					if (tryNode === pathRef.source) {
						this._flowedFinal = true;
						break;
					}
				} else {
					n = null;
					tryNode = null;
				}
			}


		} else {
			var startIndex = pathRef.indexOf(node);
			if (startIndex < 0) return null;
			if (startIndex >= pathRef.length - 1) {
				this._flowedFinal = true;
				return resultArr;
			}
			tryNode = pathRef[++startIndex];
			firstEdge = this.navMesh.regions[node].getEdgeTo(this.navMesh.regions[tryNode]);
			resultArr.push(firstEdge);
			n = tryNode;
			while (n!==null) {
				tryNode = pathRef[++startIndex];
				if (!tryNode) break;
				tryEdge = this.navMesh.regions[n].getEdgeTo(this.navMesh.regions[tryNode]);
				resultArr.push(tryEdge);
				n = tryEdge.vertex === firstEdge.vertex || tryEdge.prev.vertex === firstEdge.prev.vertex ? tryNode : null;

				if (getAll) n = tryNode;
			}

			this._flowedFinal = startIndex >= pathRef.length - 1;
		}
		return resultArr;
	}

	setupTriangulation(fromPortal, nextPortal) {
		if (!fromPortal && !(fromPortal = this.triangulationMap.get(nextPortal.polygon))) {
			// get conventional makeshift triangulation towards "nextPortal", pick largest opposite edge towards newPortal
			// OR simply pick largest edge that isn't nextPortal

			// pick largest edge only

			let longestEdgeDist = 0;
			let edge = nextPortal.polygon.edge;
			do {
				if (edge !== nextPortal ) {
					let dist = edge.squaredLength();
					if (dist >= longestEdgeDist) {  // (fromPortal && (!fromPortal.twin && edge.twin))
						longestEdgeDist = dist;
						fromPortal = edge;
					}
				}
				edge = edge.next;
			} while(edge !== nextPortal.polygon.edge);

			this.triangulationMap.set(nextPortal.polygon, fromPortal);
		}

		let triangulation = null;
		if (!this.triangulationMap) {	// non-persitant  // TODO: triangulationMap still required
			if (!this.localTriangulation) {
				this.localTriangulation = new FlowTriangulate(fromPortal, nextPortal);
			}
			triangulation = this.localTriangulation;

		} else {	// persitant
			let triangulationMap = this.triangulationMap;
			let persistKey = fromPortal;
			triangulation = triangulationMap.get(persistKey);
			if (!triangulation) {
				// setup triangulation o store in map
				triangulation = new FlowTriangulate(fromPortal, nextPortal);
				triangulationMap.set(persistKey, triangulation);
			}
		}
		return triangulation;
	}

	/**
	 * An implementation of:
	 * http://citeseerx.ist.psu.edu/viewdoc/download?doi=10.1.1.68.875&rep=rep1&type=pdf#page=2
	 * @param {Polygon} region The starting polygon reference to calculate flowfield for
	 * @param {Array<HalfEdge>} edgeFlows List of connecting portal edges along path up to the edge which doesn't share any vertex with the first portal edge
	 * @param {Vector3} finalDestPt	Final destination point reference
	 */
	_calcTriRegionField(region, edgeFlows, finalDestPt) {
		// link   nextPortal  vertex vectors along incident  X and B sets
		const a = CALC_VEC;
		const b = CALC_VEC2;
		const c = CALC_VEC3;
		let edgeFieldMap = this.edgeFieldMap;

		// Launch flow vector from isolated vertex corner

		let edge = region.edge;	// 1st edge
		let tryEdge = edgeFlows[0];
		// link start vertex vector to nextPortal's midpoint
		// get start corner flow vertex
		if (edge !== tryEdge) {
			edge = edge.next; // 2nd edge
			if (edge !== tryEdge) {
				edge = edge.next;	// 3rd edge
			}
		}

		let isolatedV = edge.next.vertex;

		a.x = isolatedV.x;
		a.z = isolatedV.z;
		b.x = (edge.vertex.x + edge.prev.vertex.x) * 0.5;
		b.z = (edge.vertex.z + edge.prev.vertex.z) * 0.5;

		edgeFieldMap.set(isolatedV, new FlowVertex(isolatedV).subVectors(b,a).normalize());

		// Calculate destination portal flow vectors
		this._calcDestPortalField(edgeFlows, isolatedV, null, finalDestPt);
	}

	_calcDestPortalField(edgeFlows, iVertex, iVertex2, finalDestPt) {
		const a = CALC_VEC;
		const b = CALC_VEC2;
		const c = CALC_VEC3;
		let edgeFieldMap = this.edgeFieldMap;

		let edge = edgeFlows[0];
		let isolatedV;

		const HANDEDNESS = USE_HANDEDNESS;

		// Calculate destination portal flow vectors
		let leftFlowVertex;
		let rightFlowVertex;
		let t;
		let i;
		// (C1) determine left B1, B2 edge to flow vertex check
		t = 0;
		isolatedV = iVertex;
		edge = edgeFlows[0];
		a.x = edge.vertex.x - isolatedV.x;
		a.z = edge.vertex.z - isolatedV.z;
		// perp boundary normal inward
		c.x = a.z * HANDEDNESS;
		c.z = -a.x * HANDEDNESS;

		tryEdge = edgeFlows[++t];
		// find non-incident portal edge along flow to vertex
		while (tryEdge && edge.vertex === tryEdge.vertex) {
			tryEdge = edgeFlows[++t];
		}
		if (tryEdge) {
			// flow along b2 for next non-incident portal
			b.x = tryEdge.vertex.x - edge.vertex.x;
			b.z = tryEdge.vertex.z - edge.vertex.z;
			// does flow along b2 lie within boundary normal?
			leftFlowVertex = new FlowVertex(edge.vertex).copy(b.x * c.x + b.z * c.z >= 0 ? b : a).normalize();
		} else {
			if (tryEdge) { // leads indirectly to end
				leftFlowVertex =  new FlowVertex(edge.vertex).copy(a).normalize();
			} else { // assumed leads directly into final destination node from starting node, finalDestPt requried
				b.x = finalDestPt.x - edge.vertex.x;
				b.z = finalDestPt.z - edge.vertex.z;
				leftFlowVertex =  new FlowVertex(edge.vertex).copy(b.x * c.x + b.z * c.z >= 0 ? b : a).normalize().initFinal(finalDestPt);
				// !Check if need to non-normalize for finalDestPt?
			}
		}
		// (C2) check X portal edges incident to leftFlowVertex to determine if initSpinning required
		for (i=1; i<t; i++) {
			tryEdge = edgeFlows[i];
			a.x = tryEdge.prev.vertex.x - tryEdge.vertex.x;
			a.z = tryEdge.prev.vertex.z - tryEdge.vertex.z;
			// perp forward normal along edge flow X
			c.x = -a.z * HANDEDNESS;
			c.z = a.x * HANDEDNESS;
			if (leftFlowVertex.x * c.x + leftFlowVertex.z * c.z < 0) {
				leftFlowVertex.initSpinning(tryEdge, false, edgeFlows[i+1], finalDestPt);
				break;
			}
		}
		// consider left to right non-tri triangulation diagonal case
		// (from left entering portal vertex to right destination portal vertex along main triangulation corridoor, if any)
		if (t === edgeFlows.length - 1) {
			tryEdge = edgeFlows[t];
			if (tryEdge.next.next.next !== tryEdge && tryEdge.prev.vertex !== edge.vertex) {
				a.x = tryEdge.prev.vertex.x - edge.vertex.x;
				a.z = tryEdge.prev.vertex.z - edge.vertex.z;
				// perp forward normal along edge flow X
				c.x = -a.z * HANDEDNESS;
				c.z = a.x * HANDEDNESS;
				if (leftFlowVertex.x * c.x + leftFlowVertex.z * c.z < 0) {
					leftFlowVertex.initSpinning(tryEdge, false, null, finalDestPt, true);
				}
			}
		}

		// (C1) determine right B1, B2 edge to flow vertex check
		t = 0;
		edge = edgeFlows[0];
		isolatedV = iVertex2 ? iVertex2 : iVertex;
		a.x = edge.prev.vertex.x - isolatedV.x;
		a.z = edge.prev.vertex.z - isolatedV.z;
		// perp boundary normal inwards (flipped in other direction for other side)
		c.x = -a.z * HANDEDNESS;
		c.z = a.x * HANDEDNESS;

		tryEdge = edgeFlows[++t];
		// find non-incident portal edge along flow to vertex
		while (tryEdge && edge.prev.vertex === tryEdge.prev.vertex) {
			tryEdge = edgeFlows[++t];
		}
		if (tryEdge) {
			// flow along b2 for next non-incident portal
			b.x = tryEdge.prev.vertex.x - edge.prev.vertex.x;
			b.z = tryEdge.prev.vertex.z - edge.prev.vertex.z;
			// does flow along b2 lie within boundary normal?
			rightFlowVertex = new FlowVertex(edge.prev.vertex).copy(b.x * c.x + b.z * c.z >= 0 ? b : a).normalize();
		} else {
			if (tryEdge) { // leads indirectly to end
				rightFlowVertex =  new FlowVertex(edge.prev.vertex).copy(a).normalize();
			} else { // assumed leads directly into final destination node from starting node, finalDestPt requried
				b.x = finalDestPt.x - edge.prev.vertex.x;
				b.z = finalDestPt.z - edge.prev.vertex.z;
				rightFlowVertex =  new FlowVertex(edge.prev.vertex).copy(b.x * c.x + b.z * c.z >= 0 ? b : a).normalize().initFinal(finalDestPt);
			}
		}
		// (C2) check X portal edges incident to rightFlowVertex to determine if initSpinning required
		for (i=1; i<t; i++) {
			tryEdge = edgeFlows[i];
			a.x = tryEdge.prev.vertex.x - tryEdge.vertex.x;
			a.z = tryEdge.prev.vertex.z - tryEdge.vertex.z;
			// perp forward normal along edge flow X
			c.x = -a.z * HANDEDNESS;
			c.z = a.x * HANDEDNESS;
			if (rightFlowVertex.x * c.x + rightFlowVertex.z * c.z < 0) {
				rightFlowVertex.initSpinning(tryEdge, true, edgeFlows[i+1], finalDestPt);
				break;
			}
		}

		let result = [leftFlowVertex, rightFlowVertex];
		edgeFieldMap.set(edge, result);
		return result;
	}

	_calcNonTriRegionField(triangulation, edgeFlows, finalDestPt) {
		const a = CALC_VEC;
		const b = CALC_VEC2;
		const c = CALC_VEC3;
		let edgeFieldMap = this.edgeFieldMap;

		let edge = triangulation.fromPortal;	// from inside of region
		let tryEdge = triangulation.nextPortal; // from inside of region

		if (tryEdge !== edgeFlows[0]) {
			throw new Error("Assertion failed: nextPortal of triangulation should match edgeFlows[0] assumption!");
		}

		let leftFlowVertex = null;
		let rightFlowVertex = null;

		// Determine fromPortal flow vectors

		// towards nextPortal on left border, fromPortal
		if (edge.prev.vertex !== tryEdge.vertex) {
			a.x = edge.prev.vertex.x;
			a.z = edge.prev.vertex.z;
			b.x = tryEdge.vertex.x;
			b.z = tryEdge.vertex.z;
			leftFlowVertex = new FlowVertex(edge.prev.vertex).subVectors(b, a).normalize();
		} // else will share same vertex on fromPortal edge

		// towards nextPortal on right border, fromPortal
		if (edge.vertex !== tryEdge.prev.vertex) {
			a.x = edge.vertex.x;
			a.z = edge.vertex.z;
			b.x = tryEdge.prev.vertex.x;
			b.z = tryEdge.prev.vertex.z;
			rightFlowVertex = new FlowVertex(edge.vertex).subVectors(b, a).normalize();
		} // else will share same vertex on fromPortal edge

		let fromPortalVectors;
		edgeFieldMap.set(edge, fromPortalVectors = [leftFlowVertex, rightFlowVertex]);

		// Calculate destination portal flow vectors
		let result = this._calcDestPortalField(edgeFlows, leftFlowVertex ? leftFlowVertex.vertex : rightFlowVertex.vertex,
			(leftFlowVertex && rightFlowVertex) ? rightFlowVertex.vertex : null, finalDestPt);


		if (!fromPortalVectors[0]) {
			fromPortalVectors[0] = result[0];
		}

		if (!fromPortalVectors[1]) {
			fromPortalVectors[1] = result[1];
		}

		let destResult = result;

		// debugging...
		if (!fromPortalVectors[0] || !fromPortalVectors[1]) {
			throw new Error("Could not resolve fromPortalVectors:"+fromPortalVectors);
		}
		let testEdgeVectors = edgeFieldMap.get(triangulation.nextPortal);
		if (testEdgeVectors !== result) throw new Error("Should match!");
		if (!testEdgeVectors[0] || !testEdgeVectors[1]) throw new Error("Should have all vectors!")

		let i;
		let len;
		let fanEdgeFlows;
		if (triangulation.leftEdgeFlows) {
			fanEdgeFlows = triangulation.leftEdgeFlows;
			len = fanEdgeFlows.length;
			for (i=1; i<len; i++) {
				result = this._calcDestPortalField(edgeFlows, fanEdgeFlows[i][1].vertex, null, finalDestPt);
				fanEdgeFlows[i][0] = result[0];
				if (!fanEdgeFlows[i][0] || !fanEdgeFlows[i][1]) {
					throw new Error("Did not fill up fan edge flows...left");
				}
			}
			fanEdgeFlows[0][0] = destResult[0];
			if (!fanEdgeFlows[0][0] || !fanEdgeFlows[0][1]) {
				throw new Error("Did not fill up fan edge flows...left000");
			}
		}

		if (triangulation.rightEdgeFlows) {
			fanEdgeFlows = triangulation.rightEdgeFlows;
			len = fanEdgeFlows.length;
			for (i=1; i<len; i++) {
				result = this._calcDestPortalField(edgeFlows, fanEdgeFlows[i][0].vertex, null, finalDestPt);
				fanEdgeFlows[i][1] = result[1];
				if (!fanEdgeFlows[i][0] || !fanEdgeFlows[i][1]) {
					throw new Error("Did not fill up fan edge flows...right");
				}
			}
			fanEdgeFlows[0][1] = destResult[1];
			if (!fanEdgeFlows[0][0] || !fanEdgeFlows[0][1]) {
				throw new Error("Did not fill up fan edge flows...right000");
			}
		}

	}

	static calcFinalRegionField(region, finalDestPt, edgeFieldMap) {
		const a = CALC_VEC;
		const b = CALC_VEC2;

		// calculate
		if (!edgeFieldMap.has(region.edge.vertex)) {
			edge = region.edge;
			do {
				edgeFieldMap.set(edge.vertex, new FlowVertex(edge.vertex));
				edge = edge.next;
			} while (edge !== region.edge)
		}

		edge = region.edge;
		do {
			flowVertex = edgeFieldMap.get(edge.vertex);
			a.x = edge.vertex.x;
			a.z = edge.vertex.z;
			b.x = finalDestPt.x;
			b.z = finalDestPt.z;
			flowVertex.subVectors(b, a);
			flowVertex.initFinal(finalDestPt);

			edge = edge.next;
		} while(edge !== region.edge)
	}

	getFromNodeIndex(lastRegion, newRegion, pathRef) {
		let startIndex = this.navMesh.getNodeIndex(lastRegion);
		let endIndex = this.navMesh.getNodeIndex(newRegion);
		if (!pathRef) pathRef = this.pathRef;

		if (!Array.isArray(pathRef)) { // Dijkstra assumed pre-searched (ie. source is fill "destination")
			// iterate through all regions to find lowest costs
			let costs = pathRef._cost;
			let tryCost = LARGEST_NUM;
			let n = startIndex;
			let tryNode;
			let tryEdge;
			let firstEdge = null;

			while(n !== null) {
				let edges = this.navMesh.graph._edges.get( n );
				let len = edges.length;

				tryNode = null;

				for (let i=0; i<len; i++) {

					let toN = edges[i].to;
					if (toN === endIndex) {
						return n;
					}
					if (costs.has(toN) && costs.get(toN) < tryCost) {
						tryCost = costs.get(toN);
						tryNode = toN;
					}
				}

				// early break out continuiuty
				if (tryNode !== null) {
					tryEdge = this.navMesh.regions[n].getEdgeTo(this.navMesh.regions[tryNode]);
					if (firstEdge !== null) {
						n = tryEdge.vertex === firstEdge.vertex || tryEdge.prev.vertex === firstEdge.prev.vertex ? tryNode : null;
					} else {
						firstEdge = tryEdge;
						n = tryNode;
					}
				} else {
					return -1;
				}
			}

			return -1;

		} else {
			var index = pathRef.indexOf(endIndex);
			if (index <= 0) return -1;
			return pathRef[index - 1];
		}
	}

	/**
	 *
	 * @param {Number} fromNode	Node index to originate from (if any). If unspecified, put as -1.
	 * Using this for entering non-tri regions can influence shape of main corridoor triangulation which goes directly (fromNode) to (destination node of node). Using this for entering tri-regions isn't required at all. (use -1)
	 * @param {Number} node	Node index to start from
	 * @param {[Node]|(Dijkstra)} pathRef	Result from getPath(), or pre-searched to destination Dijkstra
	 * @param {Vector3}	finalDestPt	Final destination point for flowfield.
	 * Required if the 'node' is a final node or last-before-final node along pathRef. If unsure, just include it in.
	 * In some cases, this has to be excluded if final destination point is not known or ever-changing per frame, in which case 'node' cannot be the final node along pathRef.
	 * @return {Array} List of edge-flows used in the calculation
	 */
	calcRegionFlow(fromNode, node, pathRef, finalDestPt) {
		if (!pathRef) {
			pathRef = this.pathRef;
			if (!pathRef) throw new Error("calcRegionFlow:: unable to retrieve pathRef!");
		}
		let flowKey = fromNode + "," + node;
		if (this.savedRegionFlows) {
			if (this.savedRegionFlows.has(flowKey)) return this.savedRegionFlows.get(flowKey);
		}

		let region = this.navMesh.regions[node];
		let edgeFieldMap = this.edgeFieldMap;
		let edge;
		let flowVertex;


		edgeFlows = this.getFlowEdges(node, pathRef);

		if (this.savedRegionFlows) {
			this.savedRegionFlows.set(flowKey, edgeFlows);
		}

		if (edgeFlows === null) {
			// could not find path from "node" along pathRef
			return null;
		}


		if (edgeFlows.length === 0) { // asssumed "node" is last region, finalDestPt must be included in order to calculate this
			NavMeshFlowField.calcFinalRegionField(region, finalDestPt, edgeFieldMap);
			return edgeFlows;
		}

		let nextPortal = edgeFlows[0];
		if (!edgeFieldMap.has(nextPortal)) {
			edgeFieldMap.set(nextPortal, [new FlowVertex(nextPortal.vertex), new FlowVertex(nextPortal.prev.vertex)]);
		}

		let fromPortal;
		// fromPortal not required if calculating region flow in triangle node...
		if (region.edge.next.next.next === region.edge) fromPortal = null;
		else fromPortal = fromNode >= 0 ? this.navMesh.regions[fromNode].getEdgeTo(region).twin : null; // determine with node/fromNode (if any);

		if (fromPortal) {
			if (!edgeFieldMap.has(fromPortal)) {
				edgeFieldMap.set(fromPortal, [new FlowVertex(fromPortal.vertex), new FlowVertex(fromPortal.prev.vertex)]);
			}
		}

		// remove finalDestPt reference if not applicable along edgeFlows (ie. last destination node along edgeFLow isn't final destination node)
		if (!this._flowedFinal) finalDestPt = null;

		if (region.edge.next.next.next !== region.edge) {	// >=4ngon region
			let triangulation = this.setupTriangulation(fromPortal, nextPortal);
			this._calcNonTriRegionField(triangulation, edgeFlows, finalDestPt);
			this.lastTriangulation = triangulation;
		} else {	// triangle region
			this._calcTriRegionField(region, edgeFlows, finalDestPt);
		}

		return edgeFlows;
	}

}

export { NavMeshFlowField };