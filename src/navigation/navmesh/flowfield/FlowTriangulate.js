import { HalfEdge } from '../../../math/HalfEdge.js';
import { Vector3 } from '../../../math/Vector3.js';
import { FlowVertex } from './FlowVertex.js';

/**
 * Makeshift triangulation of a non-tri polygon using a prefered fromPortal to nextPortal main lane (`==0`) (within navmesh polygon region)
 * and fanned edges leading to nextPortal that forms sub-lanes (`<0` for left fan lanes and `>0` for right fan lanes)
 *
 * Also contains static/non-static method to triangulate flow vertices for a given agent.
 */
class FlowTriangulate {
	constructor(fromPortal, nextPortal) {
		this.fromPortal = fromPortal;
		this.nextPortal = nextPortal;

		//  normals and vectors
		let polygon = this.fromPortal.polygon;

		let isQuadCorridoor = nextPortal.next !== fromPortal && nextPortal.prev !== fromPortal;
		if (isQuadCorridoor) {
			let dx = nextPortal.prev.vertex.x - fromPortal.prev.vertex.x;
			let dz = nextPortal.prev.vertex.z - fromPortal.prev.vertex.z;
			this.diagonal = new Vector3(-dz, 0, dx);
			this.diagonal.offset = this.diagonal.x * fromPortal.prev.vertex.x + this.diagonal.z * fromPortal.prev.vertex.z;
		}

		let isQuad = polygon.edge.next.next.next.next === polygon.edge;

		// if quad and fromPortal and nextPortal is disconnected, don't need to proceed further as no additional edges to fan to nextPortal
		if (isQuad && isQuadCorridoor) return;


		if (nextPortal.next !== fromPortal) {
			this.leftEdgeDirs = [new Vector3()];
			this.leftEdgeFlows = [FlowTriangulate.calculateDirForFanEdge(fromPortal.prev.vertex, nextPortal.vertex, this.leftEdgeDirs[0], false)];
		}
		if (nextPortal.prev !== fromPortal) {
			this.rightEdgeDirs = [new Vector3()];
			this.rightEdgeFlows = [FlowTriangulate.calculateDirForFanEdge(fromPortal.vertex, nextPortal.prev.vertex, this.rightEdgeDirs[0], true)];
		}




		let edge = polygon.edge;
		let fEdge;
		let dir;
		let vert;
		let debugCount = 0;
		let debugEdgeCount = 0;
		let debugLeftCount = 0;
		let debugRightCount = 0;
		do { //  debug check this calculation quantities
			debugEdgeCount++;
			if (edge !== fromPortal && edge !== nextPortal) {
				if ( (dir=(this.leftEdgeDirs ? this.leftEdgeDirs[0] : false)) && (dir.x*edge.vertex.x + dir.z*edge.vertex.z > dir.offset) ) {
					if (edge.vertex !== fromPortal.vertex && edge.vertex !== fromPortal.prev.vertex && edge.vertex !== nextPortal.vertex && edge.vertex !== nextPortal.prev.vertex) {
						this.leftEdgeDirs.push(dir = new Vector3());
						this.leftEdgeFlows.push(FlowTriangulate.calculateDirForFanEdge(edge.vertex, nextPortal.vertex, dir, false));
						debugCount++;
						debugLeftCount++;
					}
				}
				else if ( (dir=(this.rightEdgeDirs ? this.rightEdgeDirs[0] : false)) && (dir.x*edge.vertex.x + dir.z*edge.vertex.z > dir.offset) ) {
					if (edge.vertex !== fromPortal.vertex && edge.vertex !== fromPortal.prev.vertex && edge.vertex !== nextPortal.vertex && edge.vertex !== nextPortal.prev.vertex) {
						this.rightEdgeDirs.push(dir = new Vector3());
						this.rightEdgeFlows.push(FlowTriangulate.calculateDirForFanEdge(edge.vertex, nextPortal.prev.vertex, dir, true));
						debugCount++;
						debugRightCount++;
					}
				}
			}
			edge = edge.next;
		} while (edge!==polygon.edge)

		if (debugCount !== debugEdgeCount - 2 - (this.leftEdgeDirs ? 1 : 0) - (this.rightEdgeDirs ? 1 : 0)) {
			console.warn("Debug count assertion mismatch!!: " + debugCount + " / "+ debugEdgeCount);
			console.log(this);
		} else {
			console.log("Debug count succeeded:" + debugLeftCount + "," + debugRightCount);
		}
	}

	/**
	 * Updates agent's a,b,c flow triangle flow-vertices from a given tri-region polygon along main path corridoor
	 * @param {Vector3} pos	The position of agent within polygon region
	 * @param {Object} result Typically a FlowAgent object that has `a`, `b`, and `c` flow vertices=
	 * @param {Map} edgeFieldMap Edge field map from flowfield to get flow vectors along main region portals along path corridoor
	 */
	static updateTriRegion(region, result, edgeFieldMap) {
		//edgeFieldMap.get(region.a);
		let targetEdge =
			edgeFieldMap.has(region.edge) ? region.edge :
			edgeFieldMap.has(region.edge.prev) ? region.edge.prev :
												 region.edge.next;


		result.a = edgeFieldMap.get(targetEdge.next.vertex);
		targetEdge = edgeFieldMap.get(targetEdge);
		result.b = targetEdge[1];
		result.c = targetEdge[0];

		if (!result.a || !result.b || !result.c) {
			throw new Error("Failed to get default triangle flowfield for flowfield updateTriRegion");
		}

		if (result.prevEdge) FlowTriangulate.checkPrevFlowVertices(result, result.prevEdge);
		if (result.lastSavedEdge) FlowTriangulate.checkPrevFlowVertices(result, result.lastSavedEdge);
	}

	/**
	 * Naive cache flow vertex check for agent to re-use previous flow-edge vertices along flowfield
	 * @param {Object} result The agent with a,b,c flow vertices
	 * @param {Array<FlowVertex>} prevFlowEdge	The flow edge cache to check
	 */
	static checkPrevFlowVertices(result, prevFlowEdge) {
		let gotReplace = false;
		if (result.a.vertex === prevFlowEdge[0].vertex  ) {
			result.a = prevFlowEdge[0];
			gotReplace = true;
		} else if (result.a.vertex === prevFlowEdge[1].vertex  ) {
			result.a = prevFlowEdge[1];
			gotReplace = true;
		}

		if (result.b.vertex === prevFlowEdge[0].vertex  ) {
			result.b = prevFlowEdge[0];
			gotReplace = true;
		} else if (result.b.vertex === prevFlowEdge[1].vertex  ) {
			result.b = prevFlowEdge[1];
			gotReplace = true;
		}

		if (result.c.vertex === prevFlowEdge[0].vertex  ) {
			result.c = prevFlowEdge[0];
			gotReplace = true;
		} else if (result.c.vertex === prevFlowEdge[1].vertex  ) {
			result.c = prevFlowEdge[1];
			gotReplace = true;
		}
		return gotReplace;
	}

	/**
	 * Updates agent's a,b,c flow triangle flow-vertices based on it's lane
	 * @param {Vector3} pos	The position of agent within polygon region
	 * @param {Object} result Typically a FlowAgent object that has `a`, `b`, and `c` flow vertices, and `lane` index variable storage that was already updated based off it's position
	 * @param {Map} edgeFieldMap Edge field map from flowfield to get flow vectors along main region portals along path corridoor
	 */
	updateFlowTri(pos, result, edgeFieldMap) {
		let norm;
		let a;
		let b;
		let c;
		if (result.lane === 0) {
			if (this.diagonal) { // quad lane
				norm = this.diagonal;
				a = edgeFieldMap.get(this.fromPortal)[1]; // this.fromPortal.prev.vertex;
				if (norm.x * pos.x + norm.z * pos.z >= 0) {	// left (top left)
					b = edgeFieldMap.get(this.nextPortal)[1]; // this.nextPortal.prev.vertex;
					c = edgeFieldMap.get(this.nextPortal)[0]; // this.nextPortal.vertex;
				} else {	// right (bottom right)
					b = edgeFieldMap.get(this.fromPortal)[0]; // this.fromPortal.vertex;
					c = edgeFieldMap.get(this.nextPortal)[1]; // this.nextPortal.prev.vertex;
				}
			} else { // tri lane
				a = edgeFieldMap.get(this.fromPortal)[1]; // this.fromPortal.prev.vertex;
				b = edgeFieldMap.get(this.fromPortal)[0]; // this.fromPortal.vertex;
				c = edgeFieldMap.get(this.nextPortal)[this.nextPortal.vertex !== a.vertex && this.nextPortal.vertex !== b.vertex ? 0 : 1];
			}
		} else {
			let leftwards = result.lane < 0;
			let tarEdgeFlows = leftwards ? this.leftEdgeFlows : this.rightEdgeFlows;
			let index = leftwards ? -result.lane : result.lane;
			let subIndex = leftwards ? 1 : 0;
			let edgeFlow = tarEdgeFlows[index][subIndex];
			index++;
			let edgeFlow2 = tarEdgeFlows[index][subIndex];


			subIndex = leftwards ? 0 : 1;
			let portalVertexFlow = tarEdgeFlows[index][subIndex];

			// leftwards: edgeFlow, portalVertexFlow, edgeFlow2
			// rightwards: edgeFlow, edgeFlow2, portalVertexFlow
			if (leftwards) {
				a = edgeFlow;
				b = portalVertexFlow;
				c = edgeFlow2;
			} else {
				a = edgeFlow;
				b = edgeFlow2;
				c = portalVertexFlow;
			}
		}

		result.a = a;
		result.b = b;
		result.c = c;

		if (result.prevEdge) FlowTriangulate.checkPrevFlowVertices(result, result.prevEdge);
		if (result.lastSavedEdge) FlowTriangulate.checkPrevFlowVertices(result, result.lastSavedEdge);
	}

	/**
	 * Updates agent's lane index within non-tri polygon
	 * @param {Vector3} pos	The position of agent within polygon region
	 * @param {Object} result Typically a FlowAgent object that has `a`, `b`, and `c` flow vertices, and `lane` index variable storage
	 */
	updateLane(pos, result) {
		let dir;
		let lane;
		let len;
		let i;
		// TODO: lane direction break check and updating of prevEdges/lastSavedEdge
		if ( (dir=(this.leftEdgeDirs ? this.leftEdgeDirs[0] : false)) && (dir.x*pos.x + dir.z*pos.z > dir.offset) ) {
			lane = -1;
			len = this.leftEdgeDirs.length;
			for (i=1; i<len; i++) {
				dir = this.leftEdgeDirs[i];
			}
			if (lane < result.lane) { // agent inadvertedly backpedaled position, break continuity of motion?
				result.lastSavedEdge = null;
				result.prevEdge = null;
			} else if (lane > result.lane) {
				// update prevEdge,
				// keep lastSavedEdge if found, else set to same as prevEdge
			}

		} else if ( (dir=(this.rightEdgeDirs ? this.rightEdgeDirs[0] : false)) && (dir.x*pos.x + dir.z*pos.z > dir.offset) ) {
			lane = 1;
			len = this.rightEdgeDirs.length;
			for (i=1; i<len; i++) {
				dir = this.rightEdgeDirs[i];
			}
			if (lane > result.lane) {  // agent inadvertedly backpedaled position, break continuity of motion?
				result.lastSavedEdge = null;
				result.prevEdge = null;
			} else if (lane < result.lane) {
				// update prevEdge,
				// keep lastSavedEdge if found, else set to same as prevEdge
			}
		} else {
			lane = 0;
		}


		result.lane = lane;
	}

	static calculateDirForFanEdge(startVertex, destVertex, dir, rightSided) {
		let dx = destVertex.x - startVertex.x;
		let dz = destVertex.z - startVertex.z;
		let flowVertex = new FlowVertex(startVertex);
		flowVertex.x = dx;
		flowVertex.z = dz;
		flowVertex.normalize();

		let multSide = rightSided ? -1 : 1;
		dir.x = -dz*multSide;
		dir.z = dx*multSide;
		dir.offset = dir.x * startVertex.x + dir.z * startVertex.z;

		// flow vertices below
		return rightSided ? [flowVertex, null] :  [null, flowVertex];
	}

}

export { FlowTriangulate };