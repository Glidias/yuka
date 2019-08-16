import { Polygon } from '../../math/Polygon.js';
import { FlowTriangulate } from './FlowTriangulate.js';
import { FlowVertex } from './FlowVertex.js';

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
	 * @return [Number] All nodes that comprise of the necesary regions to be able to help calculate flowfield from given node (as if starting from that node).
	 *  If no path can be found from given node, returns null.
	 */
	static getFlowNodesFrom(node, pathRef) {
		let resultArr = [];
		if (!Array.isArray(pathRef)) { // Dijkstra assumed or it's _cost map representing the costs it takes to get to final destination node from given node key
			// iterate through all regions to find lowest costs
			let costs = pathRef._costs ? pathRef._costs : pathRef;

			let n = node;


			let edges = this.navMesh.graph._edges.get( n );
			let len = edges.length;

			let tryCost = 99999999999999;
			let tryNode = null;

			for (let i=0; i<len; i++) {

				let toN = edges[i].to;
				if (costs.has(toN) && costs.get(toN) < tryCost) {
					tryCost = costs.get(toN);
					tryNode = toN;
				}
			}

			if (tryNode !== null) resultArr.push(tryNode);
			else {
				return null;
			}



		} else {
			var startIndex = pathRef.indexOf(region);
			if (startIndex < 0) return null;


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

	/**
	 *
	 * @param {Number} fromNode	Node index to originate from (if any). If unspecified, put as -1.
	 * Using this for entering non-tri regions can influence shape of main corridoor triangulation which goes directly (fromNode) to (destination node of node). Using this for entering tri-regions isn't required at all. (use -1)
	 * @param {Number} node	Node index to start from
	 * @param {[Node]|(Dijkstra|Map)} pathRef	Result from getPath(), or pre-searched to destination Dijkstra result cost map
	 * @return ...
	 */
	calcRegionFlow(fromNode, node, pathRef) {
		if (this.savedRegionFlows && this.savedRegionFlows.has(fromNode + "," + node)) {
			return;
		}
		if (!pathRef) {
			pathRef = this.pathRef;
			if (!pathRef) throw new Error("calcRegionFlow:: unable to retrieve pathRef!");
		}
		let region = this.navMesh.regions[node];
		let edgeFieldMap = this.edgeFieldMap;

		// let fromPortal = fromNode >= 0 ? getFromPortal : null; // determine with node/fromNode (if any)

		//let nextRegion =
		// let nextPortal = region.getPortalEdgeTo(nextRegion);

		// with region, pathref
		// determine from (possibly prev portal) and start portal to all incident portals..leadning up to final non-incident portal's polygon (note: not destination polygon but current plygon)
		// list of portals to check under set X, incident to a given vertex
		// list of border edges to check under set B, incident to a given vertex

		// list of regions

		// fromPortal not required if calculating region flow in triangle node...
		if (region.edge.next.next.next === region.edge) fromPortal = null;

		if (fromPortal) {
			if (!edgeFieldMap.has(fromPortal)) {
				edgeFieldMap.set(fromPortal, [new FlowVertex(fromPortal.prev.vertex), new FlowVertex(fromPortal.vertex)]);
			}
		}

		if (!edgeFieldMap.has(nextPortal)) {
			edgeFieldMap.set(nextPortal, [new FlowVertex(nextPortal.prev.vertex), new FlowVertex(nextPortal.vertex)]);
		}

		if (region.edge.next.next.next !== region.edge) {	// >=4ngon region
			this.setupTriangulation(fromPortal, toPortal);
			// link vecctor fromPortal to nextPortal interval vertex vectors along main coriddoor of triangulation

			//  .. for fan edges of triangulation
			// link vector from fan edge to destination portal left/right vertices
			// determine nextPortal flow vectors from fanned edges of triangulation along incident  X and B sets


		} else {	// triangle region

			// link start vertex vector to nextPortal's midpoint

			// link   nextPortal  vertex vectors along incident  X and B sets

			//edgeFieldMap.set(vertex_not_shared_by_nextPortal, [new FlowVertex(vertex_not_shared_by_nextPortal));
		}

	}

}

export { NavMeshFlowField };