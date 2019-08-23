import { HalfEdge } from '../../../math/HalfEdge.js';
import { Vector3 } from '../../../math/Vector3.js';

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
			let dz  =nextPortal.prev.vertex.z - fromPortal.prev.vertex.z;
			this.diagonal = new Vector3(-dz, 0, dx);
			this.diagonal.offset = this.diagonal.x * fromPortal.prev.vertex.x + this.diagonal.z * fromPortal.prev.vertex.z;
		}

		// if quad and fromPortal and nextPortal is disconnected, don't need to proceed further as no additional edges to fan to nextPortal
		if (polygon.edge.next.next.next.next === polygon.edge && isQuadCorridoor) return;



		if (nextPortal.next !== prevPortal) {
			this.leftEdgeDirs = [new Vector3()];
			this.leftEdgeFlows = [FlowTriangulate.calculateDirForFanEdge(fromPortal.vertex, nextPortal.vertex, this.leftEdgeDirs[0], false)];
		}
		if (nextPortal.prev !== prevPortal) {
			this.rightEdgeDirs = [new Vector3()];
			this.rightEdgeFlows = [FlowTriangulate.calculateDirForFanEdge(fromPortal.prev.vertex, nextPortal.prev.vertex, this.rightEdgeDirs[0], true)];
		}

		let edge = polygon.edge;
		let fEdge;
		let dir;
		let vert;
		do {
			if (edge !== fromPortal && edge !== nextPortal) {
				if ( (dir=(this.leftEdgeDirs ? this.leftEdgeDirs[0] : false)) && (dir.x*edge.vertex.x + dir.z*edge.vertex.z > dir.offset) ) {
					this.leftEdgeDirs.push(dir = new Vector3());
					this.leftEdgeFlows.push(FlowTriangulate.calculateDirForFanEdge(edge.vertex, nextPortal.vertex, dir, false));
				}
				else if ( (dir=(this.rightEdgeDirs ? this.rightEdgeDirs[0] : false)) && (dir.x*edge.prev.vertex.x + dir.z*edge.prev.vertex.z > dir.offset) ) {
					this.rightEdgeDirs.push(dir = new Vector3());
					this.rightEdgeFlows.push(FlowTriangulate.calculateDirForFanEdge(edge.prev.vertex, nextPortal.prev.vertex, dir, true));
				}
			}
			edge = edge.next;
		} while (edge!==polygon.edge)
	}

	/**
	 * Updates agent's a,b,c flow triangle flow-vertices from a given tri-region polygon along main path corridoor
	 * @param {Vector3} pos	The position of agent within polygon region
	 * @param {Object} result Typically a FlowAgent object that has `a`, `b`, and `c` flow vertices=
	 * @param {Map} edgeFieldMap Edge field map from flowfield to get flow vectors along main region portals along path corridoor
	 */
	static updateTriRegion(region, result, edgeFieldMap) {
		//edgeFieldMap.get(region.a);
	}

	/**
	 * Updates agent's a,b,c flow triangle flow-vertices
	 * @param {Vector3} pos	The position of agent within polygon region
	 * @param {Object} result Typically a FlowAgent object that has `a`, `b`, and `c` flow vertices, and `lane` index variable storage
	 * @param {Map} edgeFieldMap Edge field map from flowfield to get flow vectors along main region portals along path corridoor
	 */
	updateFlowTri(pos, result, edgeFieldMap) {
		if (result.lane === 0) {
			if (this.diagonal) {

			} else {

			}
		} else {

		}
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
		if ( (dir=(this.leftEdgeDirs ? this.leftEdgeDirs[0] : false)) && (dir.x*pos.x + dir.z*pos.z > dir.offset) ) {
			lane = -1;
			len = this.leftEdgeDirs.length;
			for (i=1; i<len; i++) {
				dir = this.leftEdgeDirs[i];
			}
			if (lane < result.lane) { // agent inadvertedly backpedaled position, break continuity of motion
				result.lastSavedEdge = null;
				result.prevEdge = null;
			}

		} else if ( (dir=(this.rightEdgeDirs ? this.rightEdgeDirs[0] : false)) && (dir.x*pos.x + dir.z*pos.z > dir.offset) ) {
			lane = 1;
			len = this.rightEdgeDirs.length;
			for (i=1; i<len; i++) {
				dir = this.rightEdgeDirs[i];
			}
			if (lane > result.lane) {  // agent inadvertedly backpedaled position, break continuity of motion
				result.lastSavedEdge = null;
				result.prevEdge = null;
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