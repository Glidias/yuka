//import { Polygon } from '../../../math/Polygon.js';
import { Vector3 } from '../../../math/Vector3.js';
import { FlowTriangulate } from './FlowTriangulate.js';
import { FlowVertex } from './FlowVertex.js';
import { isNull } from 'util';

const CALC_VEC = new Vector3();
const CALC_VEC2 = new Vector3();
const CALC_VEC3 = new Vector3();

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
		this.savedRegionFlows = new Set();
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
	 * @return [Number] All portal edges that comprise of the necesary regions to be able to help calculate flowfield from given node (as if starting from that node).
	 *  If no path can be found from given node, returns null.
	 */
	getFlowEdges(node, pathRef) {
		let resultArr = [];
		let n;
		let tryNode;
		let tryEdge;
		let firstEdge = null;
		if (!Array.isArray(pathRef)) { // Dijkstra assumed pre-searched (ie. source is fill "destination")
			// iterate through all regions to find lowest costs
			let costs = pathRef._costs;

			n = node;

			while(n !== null) {
				let edges = this.navMesh.graph._edges.get( n );
				let len = edges.length;

				let tryCost = 99999999999999;
				tryNode = null;

				for (let i=0; i<len; i++) {

					let toN = edges[i].to;
					if (costs.has(toN) && costs.get(toN) < tryCost) {
						tryCost = costs.get(toN);
						tryNode = toN;
						tryEdge = edges[i];
					}
				}

				if (tryNode !== null) {
					if (firstEdge !== null) {
						tryEdge = this.navMesh.regions[n].getEdgeTo(this.navMesh.regions[tryNode]);
						resultArr.push(tryEdge);
						n = tryEdge.vertex === firstEdge.vertex || tryEdge.prev.vertex === firstEdge.prev.vertex ? tryNode : null;
					} else {
						firstEdge = tryEdge;
						resultArr.push(tryEdge);
						n = tryNode;
					}
				} else {
					n = null;
					tryNode = null;
				}
			}
			this._flowedFinal = tryNode === pathRef.source;

		} else {
			var startIndex = pathRef.indexOf(node);
			if (startIndex < 0) return null;
			if (startIndex >= pathRef.length - 1) {
				this._flowedFinal = true;
				return resultArr;
			}
			tryNode = pathRef[startIndex+1];
			firstEdge = this.navMesh.regions[node].getEdgeTo(this.navMesh.regions[tryNode]);
			resultArr(firstEdge);
			n = tryNode;
			while (n!==null) {
				startIndex++;
				tryNode = pathRef[startIndex+1];
				tryEdge = this.navMesh.regions[n].getEdgeTo(this.navMesh.regions[tryNode]);
				resultArr.push(tryEdge);
				n = tryEdge.vertex === firstEdge.vertex || tryEdge.prev.vertex === firstEdge.prev.vertex ? tryNode : null;
			}

			this._flowedFinal = startIndex + 1 >= pathRef.length - 1;
		}
		return resultArr;
	}

	setupTriangulation(fromPortal, nextPortal) {
		if (!fromPortal) {
			// get conventional makeshift triangulation towards "nextPortal", pick largest opposite edge towards newPortal
		}

		let triangulation = null;
		if (!this.triangulationMap) {	// non-persitant
			if (!this.localTriangulation) {
				// setup local triangulation with fromPortal to nextPortal
				//this.localTriangulation =
			}
			triangulation = this.localTriangulation;

		} else {	// persitant
			let triangulationMap = this.triangulationMap;
			let persistKey = fromPortal;
			triangulation = triangulationMap.get(persistKey);
			if (!triangulation) {
				// setup triangulation o store in map
				//triangulation =
				triangulationMap.set(persistKey, triangulation);
			}
		}
		return triangulation;
	}

	//a = new FlowVertex(this.curRegion.edge.vertex);
	//b = new FlowVertex(this.curRegion.edge.next.vertex);
	//c = new FlowVertex(this.curRegion.edge.prev.vertex);



	_calcTriRegionField(region, edgeFlows, finalDestPt) {
		// link   nextPortal  vertex vectors along incident  X and B sets
		const a = CALC_VEC;
		const b = CALC_VEC2;
		const c = CALC_VEC3;
		let edgeFieldMap = this.edgeFieldMap;


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

		a.x = isolatedV.vertex.x;
		a.z = isolatedV.vertex.z;
		b.x = (edge.vertex.x + edge.prev.vertex.x) * 0.5;
		b.z = (edge.vertex.z + edge.prev.vertex.z) * 0.5;

		edgeFieldMap.set(isolatedV, new FlowVertex(isolatedV).subVectors(b,a).normalize());

		let poly;

		let leftFlowVertex;
		let rightFlowVertex;
		let f;
		let t;
		// determine left B1, B2 edge to flow vertex check
		t = 0;
		edge = edgeFlows[0];
		a.x = edge.vertex.x - isolatedV.x;
		a.z = edge.vertex.z - isolatedV.z;
		// perp
		c.x = -a.z;
		c.z = a.x;

		tryEdge = edgeFlows[++t];  // find non-incident portal edge along flow to vertex
		while (tryEdge && edge.vertex === tryEdge.vertex) {
			tryEdge = edgeFlows[++t];
		}
		if (tryEdge) {
			// flow along b2 for next non-incident portal
			b.x = tryEdge.vertex.x - edge.vertex.x;
			b.z = tryEdge.vertex.z - edge.vertex.z;
			// does flow along b2 lie within boundary normal for b1 (a(perp)?
			leftFlowVertex = new FlowVertex(edge.vertex).copy(b.x * c.x + b.z * b.z >= 0 ? b : a).normalize();
		} else {
			// finalDestPt required to determine b comparison
		}



		// determine left X set (all subsequent edges incident to edge left vertex)



		// determine right B1, B2 edge to flow vertex check
		b1 = edge.prev;
		b2 = edge.twin.next;
		poly = edge.twin;
		if (poly.edge.next.next.next !== poly.edge) {
			// b2 vector
		} else {

		}
		// determine right X set (all subsequent edges incident to edge right vertex)

	}

	_calcNonTriRegionField(triangulation, edgeFlows, finalDestPt) {
		//  .. for fan edges of triangulation
		// link vector from fan edge to destination portal left/right vertices

		// determine nextPortal flow vectors from fanned edges of triangulation along incident  X and B sets
	}

	static calcFinalRegionField(region, finalDestPt, edgeFieldMap) {
		const a = CALC_VEC;
		const b = CALV_VEC2;

		// calculate
		if (!edgeFieldMap.has(region.edge.vertex)) {
			edge = region.edge;
			do {
				edgeFieldMap.set(edge.vertex, new FlowVertex(edge.vertex));
				edge = edge.next;
			} while(edge !== region.edge)
		}

		edge = region.edge;
		do {
			flowVertex = edgeFieldMap.get(edge.vertex);
			a.x = edge.vertex.x;
			a.z = edge.vertex.z;
			b.x = finalDestPt.x;
			b.z = finalDestPt.z;
			flowVertex.subVectors(b, a).normalize();

			edge = edge.next;
		} while(edge !== region.edge)
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
		if (this.savedRegionFlows) {
			if (this.savedRegionFlows.has(fromNode + "," + node)) return;
			this.savedRegionFlows.set(fromNode+","+node);
		}

		let region = this.navMesh.regions[node];
		let edgeFieldMap = this.edgeFieldMap;
		let edge;
		let flowVertex;


		edgeFlows = this.getFlowEdges(node, pathRef);
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
		} else {	// triangle region
			this._calcTriRegionField(region, edgeFlows, finalDestPt);
		}

		return edgeFlows;
	}

}

export { NavMeshFlowField };