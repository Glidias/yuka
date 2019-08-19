import { Polygon } from '../../math/Polygon.js';
import { Vector3 } from '../../math/Vector3.js';
import { FlowTriangulate } from './FlowTriangulate.js';
import { FlowVertex } from './FlowVertex.js';

const CALC_VEC = new Vector3();
const CALC_VEC2 = new Vector3();

class NavMeshFlowField {
	constructor(navMesh) {
		this.navMesh = navMesh;
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
	 * @param {[Node]|(Dijkstra|Map)} pathRef	Result from getPath(), or pre-searched to destination Dijkstra result cost map
	 * @return [Number] All portal edges that comprise of the necesary regions to be able to help calculate flowfield from given node (as if starting from that node).
	 *  If no path can be found from given node, returns null.
	 */
	getFlowEdges(node, pathRef) {
		let resultArr = [];
		let n;
		let tryNode;
		let tryEdge;
		let firstEdge = null;
		if (!Array.isArray(pathRef)) { // Dijkstra assumed or it's _cost map representing the costs it takes to get to final destination node from given node key
			// iterate through all regions to find lowest costs
			let costs = pathRef._costs ? pathRef._costs : pathRef;

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
						tryEdge = this.navMesh.regions[n].getPortalEdgeTo(this.navMesh.regions[tryNode]);
						if (tryEdge.vertex === firstEdge.vertex || tryEdge.prev.vertex === firstEdge.prev.vertex ) {
							resultArr.push(tryEdge);
							n = tryNode;
						} else {
							n = null;
						}
					} else {
						firstEdge = tryEdge;
						resultArr.push(tryEdge);
						n = tryNode;
					}
				} else {
					n = null;
				}
			}



		} else {
			var startIndex = pathRef.indexOf(node);
			if (startIndex < 0) return null;
			if (startIndex >= pathRef.length - 1) {
				return resultArr;
			}
			tryNode = pathRef[startIndex+1];
			firstEdge = this.navMesh.regions[node].getPortalEdgeTo(this.navMesh.regions[tryNode]);
			resultArr(firstEdge);
			n = tryNode;
			while (n!==null) {
				startIndex++;
				tryNode = pathRef[startIndex+1];
				tryEdge = this.navMesh.regions[n].getPortalEdgeTo(this.navMesh.regions[tryNode]);
				if (tryEdge.vertex === firstEdge.vertex || tryEdge.prev.vertex === firstEdge.prev.vertex ) {
					resultArr.push(tryEdge);
					n = tryNode;
				} else {
					n = null;
				}
			}

		}
		return resultArr;
	}

	setupTriangulation(fromPortal, nextPortal) {
		if (!fromPortal) {
			// get conventional makeshift triangulation towards "nextPortal"
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


	static calcFinalRegionField(region, finalDestPt, edgeFieldMap) {
		let a = CALC_VEC;
		let b = CALV_VEC2;

		// calculate
		if (!edgeFieldMap.has(region.edge.vertex)) {
			edge = region.edge;
			do {
				edgeFieldMap.set(region.edge.vertex, new FlowVertex(region.edge.vertex));
				edge = edge.next;
			} while(edge !== region.edge)
		}

		edge = region.edge;
		do {
			flowVertex = edgeFieldMap.get(edge.vertex);

			// hmm...sub vectors should be in 2D instead?
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
	 * @param {[Node]|(Dijkstra|Map)} pathRef	Result from getPath(), or pre-searched to destination Dijkstra result cost map
	 * @param {Vector3}	finalDestPt	Final destination point for flowfield. Required if the 'node' is a final node or last-before-final node along pathRef. If unsure, just include it in.
	 * @param {Array} edgeFlows Precomputed edgeflows for internal usage only.
	 * @return ...
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
			return null;
		}

		if (edgeFlows.length === 0) { // asssumed "node" is last region, finalDestPt must be included in order to calculate this
			NavMeshFlowField.calcFinalRegionField(region, finalDestPt, edgeFieldMap);
			return edgeFlows;
		}

		let nextRegion = this.navMesh.regions[edgeFlows[0]];
		let nextPortal = region.getPortalEdgeTo(nextRegion);
		if (!edgeFieldMap.has(nextPortal)) {
			edgeFieldMap.set(nextPortal, [new FlowVertex(nextPortal.prev.vertex), new FlowVertex(nextPortal.vertex)]);
		}

		let fromPortal;
		// fromPortal not required if calculating region flow in triangle node...
		if (region.edge.next.next.next === region.edge) fromPortal = null;
		else fromPortal = fromNode >= 0 ? this.navMesh.regions[fromNode].getPortalEdgeTo(region).twin : null; // determine with node/fromNode (if any);

		if (fromPortal) {
			if (!edgeFieldMap.has(fromPortal)) {
				edgeFieldMap.set(fromPortal, [new FlowVertex(fromPortal.prev.vertex), new FlowVertex(fromPortal.vertex)]);
			}
		}

		// With edgeFlows,
		// list of portals to check under set X, incident to a given vertex
		// list of border edges to check under set B, incident to a given vertex

		if (region.edge.next.next.next !== region.edge) {	// >=4ngon region
			this.setupTriangulation(fromPortal, nextPortal);

			//  .. for fan edges of triangulation
			// link vector from fan edge to destination portal left/right vertices
			// determine nextPortal flow vectors from fanned edges of triangulation along incident  X and B sets

		} else {	// triangle region

			// link start vertex vector to nextPortal's midpoint

			// link   nextPortal  vertex vectors along incident  X and B sets

			//edgeFieldMap.set(vertex_not_shared_by_nextPortal, [new FlowVertex(vertex_not_shared_by_nextPortal));
		}

		return edgeFlows;
	}

}

export { NavMeshFlowField };