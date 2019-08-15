import { Polygon } from '../../math/Polygon.js';
import { FlowTriangulate } from './FlowTriangulate.js';
import { FlowVertex } from './FlowVertex.js';

class NavMeshFlowField {
	constructor(navMesh) {
		this.navMesh = navMesh;
	}

	/**
	 * Init persistant flowfield for leading up to a specific final  destination node, or for a single fixed path
	 */
	initPersistant() {
		this.edgeFieldMap = new Map();	// <Edge (of portal), [vec1, vec2]>
		this.triangulationMap = new Map();	// <Edge (of portal?|region), FlowTriangulate>
	}

	/**
	 * Init single-region+..(related regions) transitional flowfield
	 * @param {Polygon} region
	 * @param {AStar|BFS|DFS|Dijkstra} pathRef
	 */
	initTransitional(region, pathRef) {
		this.edgeFieldMap = new Map();	// <Edge (of portal), [vec1, vec2]>
		this.triangulationMap = null;
		return "";	// return string-based key for LRU cache storage
	}


	/**
	 *
	 * @param {Polygon} region
	 * @param {AStar|BFS|DFS|Dijkstra} pathRef
	 */
	static getFullPathFrom(region, pathRef) {

	}

	/**
	 *
	 * @param {Polygon} region
	 * @param {AStar|BFS|DFS|Dijkstra} pathRef
	 */
	static getFlowRegionsFrom(region, pathRef) {

	}

	//a = new FlowVertex(this.curRegion.edge.vertex);
	//b = new FlowVertex(this.curRegion.edge.next.vertex);
	//c = new FlowVertex(this.curRegion.edge.prev.vertex);

	calcRegionFlow(region, pathRef) {

		let edgeFieldMap = this.edgeFieldMap;

		//let nextRegion =
		// let prevRegion =  // wont exist for tri start
		// let fromPortal =  region.getPortalEdgeTo(prevRegion); // wont exist for tri start, if non-tri start, just pick the biggest one for makeshift triangulation
		// let nextPortal = region.getPortalEdgeTo(nextRegion);

		// with region, pathref
		// determine from (possibly prev portal) and start portal to all incident portals..leadning up to final non-incident portal's polygon (note: not destination polygon but current plygon)
		// list of portals to check under set X, incident to a given vertex
		// list of border edges to check under set B, incident to a given vertex

		// list of regions

		// check if in cache (note: for agent specific continuoous movement case, can skip calculation and leave it as null actually, but for simplicity ust include it in for now)
		if (!edgeFieldMap.has(fromPortal)) {
			edgeFieldMap.set(fromPortal, [new FlowVertex(fromPortal.prev.vertex), new FlowVertex(fromPortal.vertex)]);
		}
		if (!edgeFieldMap.has(nextPortal)) {
			edgeFieldMap.set(nextPortal, [new FlowVertex(nextPortal.prev.vertex), new FlowVertex(nextPortal.vertex)]);
		}

		if (region.edge.next.next.next !== region.edge) {	// >=4ngon region
			let triangulation = null;
			if (!this.triangulationMap) {	// non-persitant
				if (!this.localTriangulation) {
					// setup local triangulation
					//this.localTriangulation =
				}
				triangulation = this.localTriangulation;
			} else {	// persitant
				let triangulationMap = this.triangulationMap;
				let persistKey = fromPortal;
				triangulation = triangulationMap.get(persistKey); // or  get from edge instead, unless start of path region (laregest edge asumed of rthat case)
				if (!triangulation) {
					// setup triangulation o store in map
					//triangulation =
					triangulationMap.set(persistKey, triangulation);
				}
			}
			// link vecctor fromPortal to nextPortal interval vertex vectors along main coriddoor of triangulation

			//  .. for fan edges of triangulation
			// link vector from fan edge to destination portal left/right vertices
			// determine nextPortal flow vectors from fanned edges of triangulation along incident  X and B sets


		} else {	// triangle region
			// link fromPortal to nextPortal interval vertex vectors

			// link   nextPortal  vertex vectors along incident  X and B sets

			// link start vertex vector to nextPortal's midpoint
			//edgeFieldMap.set(vertex_not_shared_by_nextPortal, [new FlowVertex(vertex_not_shared_by_nextPortal));
		}

	}

}

export { NavMeshFlowField };