import { HalfEdge } from '../../../math/HalfEdge.js';
import { Vector3 } from '../../../math/Vector3.js';
import { FlowVertex } from './FlowVertex.js';

const HANDEDNESS_RIGHT = 1;
const HANDEDNESS_LEFT = -1;
var USE_HANDEDNESS = HANDEDNESS_LEFT;

var DISCONTINUOUS = false;

function pointInTriangle( a, b, c, p ) {
	return ( ( p.x - a.x ) * ( b.z - a.z ) ) - ( ( b.x - a.x ) * ( p.z - a.z ) ) >= 0 &&
	( ( p.x - b.x ) * ( c.z - b.z ) ) - ( ( c.x - b.x ) * ( p.z - b.z ) ) >= 0 &&
	( ( p.x - c.x ) * ( a.z - c.z ) ) - ( ( a.x - c.x ) * ( p.z - c.z ) ) >= 0;
	/*
	return ( cx - px ) * ( ay - py ) - ( ax - px ) * ( cy - py ) >= 0 &&
	( ax - px ) * ( by - py ) - ( bx - px ) * ( ay - py ) >= 0 &&
	( bx - px ) * ( cy - py ) - ( cx - px ) * ( by - py ) >= 0;
	*/
}

/**
 * Makeshift triangulation of a non-tri polygon using a prefered fromPortal to nextPortal main lane (`==0`) (within navmesh polygon region)
 * and fanned edges leading to nextPortal that forms sub-lanes (`<0` for left fan lanes and `>0` for right fan lanes)
 *
 * Also contains static/non-static method to triangulate flow vertices for a given agent.
 */
class FlowTriangulate {

	static setRightHanded(rightHanded) {
		USE_HANDEDNESS = rightHanded ? HANDEDNESS_RIGHT : HANDEDNESS_LEFT;
	}

	static setDiscontinuous(boo=true) {
		DISCONTINUOUS = boo;
	}

	constructor(fromPortal, nextPortal) {
		if (fromPortal.polygon !== nextPortal.polygon) throw new Error("Invalid portals -- dont belong to same polygon!")

		this.fromPortal = fromPortal;
		this.nextPortal = nextPortal;

		//  normals and vectors
		let polygon = this.fromPortal.polygon;
		let isQuadCorridoor = nextPortal.next !== fromPortal && nextPortal.prev !== fromPortal;
		if (isQuadCorridoor) {
			let dx = nextPortal.prev.vertex.x - fromPortal.prev.vertex.x;
			let dz = nextPortal.prev.vertex.z - fromPortal.prev.vertex.z;
			this.diagonal = new Vector3(-dz*USE_HANDEDNESS, 0, dx*USE_HANDEDNESS);
			if (this.diagonal.squaredLength() === 0) {
				console.log(this);
				console.error("Diagonal zero length detected");
			}
			this.diagonal.normalize(); // todo: remove and test not needed
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

			if (edge.vertex !== fromPortal.vertex && edge.vertex !== fromPortal.prev.vertex && edge.vertex !== nextPortal.vertex && edge.vertex !== nextPortal.prev.vertex) {
				dir = this.leftEdgeDirs ? this.leftEdgeDirs[0] : null;
				let resolved = false;
				if (dir &&  (dir.x*edge.vertex.x + dir.z*edge.vertex.z > dir.offset ) ) {
					dir = new Vector3();
					fEdge = FlowTriangulate.calculateDirForFanEdge(edge.vertex, nextPortal.vertex, dir, false);
					this.leftEdgeDirs.push(dir);
					this.leftEdgeFlows.push(fEdge);
					debugCount++;
					debugLeftCount++;

					resolved = true;
				}
				dir = this.rightEdgeDirs ? this.rightEdgeDirs[0] : null;
				if (dir &&  (dir.x*edge.vertex.x + dir.z*edge.vertex.z > dir.offset ) ) {
					dir = new Vector3()
					fEdge = FlowTriangulate.calculateDirForFanEdge(edge.vertex, nextPortal.prev.vertex, dir, true);

					this.rightEdgeDirs.push(dir);
					this.rightEdgeFlows.push(fEdge);
					debugCount++;
					debugRightCount++;

					resolved = true;
				}
				if (!resolved) console.warn("Failed to resolve vertex side...:"+(this.leftEdgeDirs ? " 1 ": "") + ", " + (this.rightEdgeDirs ? " 2 " : ""));
			}
			edge = edge.next;
		} while (edge!==polygon.edge)

		// For debug tracing
		if (debugCount !== debugEdgeCount - (isQuadCorridoor ? 4 : 3) ) {
			console.warn("Debug count assertion mismatch!!: " + debugCount + " / "+ debugEdgeCount);
			console.log(this);
			edge.polygon.gotErrorTriangulation = this;
			this.debugInfo = {leftEdgeDirs:this.leftEdgeDirs, rightEdgeDirs:this.rightEdgeDirs, leftEdgeFlows:this.leftEdgeFlows, rightEdgeFlows:this.rightEdgeFlows};

		}
		edge.polygon.debugTriangulation = this;

		if (this.leftEdgeDirs && this.leftEdgeDirs.length === 1) {
			this.leftEdgeDirs = null;
			this.leftEdgeFlows = null;
		}
		if (this.rightEdgeDirs && this.rightEdgeDirs.length === 1) {
			this.rightEdgeDirs = null;
			this.rightEdgeFlows = null;
		}
	}

	/**
	 * Updates agent's a,b,c flow triangle flow-vertices from a given tri-region polygon along main path corridoor
	 * @param {Vector3} pos	The position of agent within polygon region
	 * @param {Object} result Typically a FlowAgent object that has `a`, `b`, and `c` flow vertices=
	 * @param {Map} edgeFieldMap Edge field map from flowfield to get flow vectors along main region portals along path corridoor
	 */
	static updateTriRegion(region, result, edgeFieldMap) {
		let targetEdge =
			edgeFieldMap.has(region.edge) ? region.edge :
			edgeFieldMap.has(region.edge.prev) ? region.edge.prev :
												 region.edge.next;


		result.a = edgeFieldMap.get(targetEdge.next.vertex);
		targetEdge = edgeFieldMap.get(targetEdge);
		result.b = targetEdge[1];
		result.c = targetEdge[0];

		if (result.prevEdge && !FlowTriangulate.checkPrevFlowVertices(result, result.prevEdge)) {
			result.prevEdge = null;
		}
		if (result.lastSavedEdge && result.lastSavedEdge !== result.prevEdge && !FlowTriangulate.checkPrevFlowVertices(result, result.lastSavedEdge)) {
			result.lastSavedEdge = null;
		}
		// todo: check for spinning flowVertex splitNormal for subtriangle selection?
	}

		// Method 1 , check fan sector
		/*	// alternate approach, check with fan
		let foundTriEdge = null;
		let dx;
		let dz;
		let handedness = USE_HANDEDNESS;
		do {
			dz = -edge.prev.vertex.x + finalDestPt.x;
			dx = edge.prev.vertex.z - finalDestPt.z;
			dz *= handedness;
			dx *+ handedness;
			if (dz * pos.z + dx * pos.x < 0) {
				edge = edge.next;
				continue;
			}

			dz = -edge.vertex.x + finalDestPt.x;
			dx = edge.vertex.z - finalDestPt.z;
			dz *= handedness;
			dx *+ handedness;
			if (dz * pos.z + dx * pos.x > 0) {
				edge = edge.next;
				continue;
			}

			foundTriEdge = edge;
			break;

		} while (edge !== region.edge)
		*/

		/*	// Method 2 , check sector triangle
		if (pointInTriangle(finalDestPt, edge.prev.vertex, edge.vertex, pos)) {
			foundTriEdge = edge;
			break;
		}
		edge = edge.next;
		*/

	/**
	 * Updates agent's a,b,c flow triangle flow-vertices for final destination's n-gon region based off agent's position
	 * @param {Vector3} pos	The position of agent within polygon region
	 * @param {Object} result Typically a FlowAgent object that has `a`, `b`, and `c` flow vertice
	 * @param {Map} edgeFieldMap Edge field map from flowfield to get flow vectors
	 * @param {Vector3} finalDestPt The final destination point
	 */
	static updateNgonFinalTri(region, pos, result, edgeFieldMap, finalDestPt) {
		let edge = region.edge;
		let foundTriEdge = null;
		let dx;
		let dz;
		let handedness = USE_HANDEDNESS;
		do {
			dz = -edge.prev.vertex.x + finalDestPt.x;
			dx = edge.prev.vertex.z - finalDestPt.z;
			dz *= handedness;
			dx *+ handedness;
			if (dz * pos.z + dx * pos.x < 0) {
				edge = edge.next;
				continue;
			}

			dz = -edge.vertex.x + finalDestPt.x;
			dx = edge.vertex.z - finalDestPt.z;
			dz *= handedness;
			dx *+ handedness;
			if (dz * pos.z + dx * pos.x > 0) {
				edge = edge.next;
				continue;
			}

			foundTriEdge = edge;
			break;

		} while (edge !== region.edge)

		if (foundTriEdge === null) {
			console.log(region);
			throw new Error("Failed to find final destination center fan triangle");
		}

		result.a = edgeFieldMap.get(finalDestPt);
		result.b = edgeFieldMap.get(foundTriEdge.prev.vertex);
		result.c = edgeFieldMap.get(foundTriEdge.vertex);

		if (result.prevEdge && !FlowTriangulate.checkPrevFlowVertices(result, result.prevEdge)) {
			result.prevEdge = null;
		}
		if (result.lastSavedEdge && result.lastSavedEdge !== result.prevEdge && !FlowTriangulate.checkPrevFlowVertices(result, result.lastSavedEdge)) {
			result.lastSavedEdge = null;
		}
	}

	/**
	 * Naive cache flow vertex check for agent to re-use previous flow-edge vertices along flowfield (if any)
	 * @param {Object} result The agent with a,b,c flow vertices
	 * @param {Array<FlowVertex>} prevFlowEdge	The flow edge cache to check
	 * @return Whether there were any incident vertices to the given prevFlowEdge parameter
	 */
	static checkPrevFlowVertices(result, prevFlowEdge) {
		if (DISCONTINUOUS) return false;

		let gotReplace = false;
		if ( prevFlowEdge[0] && result.a.vertex === prevFlowEdge[0].vertex  ) {
			result.a = prevFlowEdge[0];
			gotReplace = true;
		} else if (prevFlowEdge[1] && result.a.vertex === prevFlowEdge[1].vertex  ) {
			result.a = prevFlowEdge[1];
			gotReplace = true;
		}

		if (prevFlowEdge[0] && result.b.vertex === prevFlowEdge[0].vertex  ) {
			result.b = prevFlowEdge[0];
			gotReplace = true;
		} else if (prevFlowEdge[1] && result.b.vertex === prevFlowEdge[1].vertex  ) {
			result.b = prevFlowEdge[1];
			gotReplace = true;
		}

		if (prevFlowEdge[0] && result.c.vertex === prevFlowEdge[0].vertex  ) {
			result.c = prevFlowEdge[0];
			gotReplace = true;
		} else if (prevFlowEdge[1] && result.c.vertex === prevFlowEdge[1].vertex  ) {
			result.c = prevFlowEdge[1];
			gotReplace = true;
		}
		return gotReplace;
	}

	/**
	 * Updates agent's a,b,c flow triangle flow-vertices based on it's stored lane value
	 * @param {Vector3} pos	The position of agent within polygon region
	 * @param {Object} result Typically a FlowAgent object that has `a`, `b`, and `c` flow vertices, and `lane` index variable storage that was already updated based off it's position
	 * @param {Map} edgeFieldMap Edge field map from flowfield to get flow vectors along main region portals along path corridoor
	 */
	updateFlowTriLaned(pos, result, edgeFieldMap) {
		let norm;
		let a;
		let b;
		let c;
		let tarEdgeFlows;
		if (result.lane === 0) {
			if (this.diagonal) { // quad lane
				norm = this.diagonal;
				a = edgeFieldMap.get(this.fromPortal)[0]; // this.fromPortal.prev.vertex;
				if (norm.x * pos.x + norm.z * pos.z >= norm.offset) {	// left (top left)
					b = edgeFieldMap.get(this.nextPortal)[1]; // this.nextPortal.prev.vertex;
					c = edgeFieldMap.get(this.nextPortal)[0]; // this.nextPortal.vertex;
				} else {	// right (bottom right)
					b = edgeFieldMap.get(this.fromPortal)[1]; // this.fromPortal.vertex;
					c = edgeFieldMap.get(this.nextPortal)[1]; // this.nextPortal.prev.vertex;
				}
			} else { // tri lane
				a = edgeFieldMap.get(this.fromPortal)[0]; // this.fromPortal.prev.vertex;
				b = edgeFieldMap.get(this.fromPortal)[1]; // this.fromPortal.vertex;
				c = edgeFieldMap.get(this.nextPortal)[this.nextPortal.vertex !== a.vertex && this.nextPortal.vertex !== b.vertex ? 0 : 1];
			}
		} else {
			let leftwards = result.lane < 0;
			tarEdgeFlows = leftwards ? this.leftEdgeFlows : this.rightEdgeFlows;
			let index = leftwards ? -result.lane - 1 : result.lane - 1;
			let subIndex = leftwards ? 1 : 0;
			let edgeFlow = tarEdgeFlows[index][subIndex];
			index++;
			let edgeFlow2 = tarEdgeFlows[index][subIndex];
			let portalVertexFlow = tarEdgeFlows[index][leftwards ? 0 : 1];


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

		if (!a || !b || !c) throw new Error("Should have abc vertices! " + result.lane + " / " + (tarEdgeFlows ? tarEdgeFlows.length : '') + " ::"+a+","+b+","+c + "["+(leftwards ? "<" : ">")+"]");

		result.a = a;
		result.b = b;
		result.c = c;

		if (result.prevEdge && !FlowTriangulate.checkPrevFlowVertices(result, result.prevEdge)) {
			result.prevEdge = null;
		}
		if (result.lastSavedEdge && result.lastSavedEdge !== result.prevEdge && !FlowTriangulate.checkPrevFlowVertices(result, result.lastSavedEdge)) {
			result.lastSavedEdge = null;
		}
		// TODO: check for spinning flowVertex splitNormal for subtriangle selection?
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
		let prevLane;
		if ( (dir=(this.leftEdgeDirs ? this.leftEdgeDirs[0] : false)) && (dir.x*pos.x + dir.z*pos.z > dir.offset) ) {
			lane = -1;
			len = this.leftEdgeDirs.length - 1;
			for (i=1; i<len; i++) {
				dir = this.leftEdgeDirs[i];
				if (dir.offset >= dir.x * pos.x + dir.z * pos.z) {
					break;
				}
				lane--;
			}
			if (lane < result.lane) { // agent inadvertedly dislodged/backpedaled position
				// break continuity of motion
				result.lastSavedEdge = null;
				result.prevEdge = null;
			} else if (lane > result.lane) {
				// update prevEdge
				prevLane = lane - 1;
				result.prevEdge = -prevLane < this.leftEdgeDirs.length - 1 ? this.leftEdgeDirs[-prevLane] : null;
				if (!result.lastSavedEdge) result.lastSavedEdge = result.prevEdge;
				if (result.prevEdge === null) {
					result.lastSavedEdge = null;
					//console.warn("Out of bounds detected for position..left");
				}
			}

		} else if ( (dir=(this.rightEdgeDirs ? this.rightEdgeDirs[0] : false)) && (dir.x*pos.x + dir.z*pos.z > dir.offset) ) {
			lane = 1;
			len = this.rightEdgeDirs.length - 1;
			for (i=1; i<len; i++) {
				dir = this.rightEdgeDirs[i];
				if (dir.offset >= dir.x * pos.x + dir.z * pos.z) {
					break;
				}
				lane++;
			}
			if (lane > result.lane) { // agent inadvertedly dislodged/backpedaled position
				// break continuity of motion
				result.lastSavedEdge = null;
				result.prevEdge = null;
			} else if (lane < result.lane) {
				prevLane = lane + 1;
				result.prevEdge = prevLane < this.rightEdgeDirs.length - 1 ? this.rightEdgeDirs[prevLane] : null;
				if (!result.lastSavedEdge) result.lastSavedEdge = result.prevEdge;
				if (result.prevEdge === null) {
					result.lastSavedEdge = null;
					//console.warn("Out of bounds detected for position..right");
				}
			}
		} else {
			lane = 0;
		}

		// debug
		//if (lane != 0) console.log("Lane != 0 case detected:"+lane +" / "+ (lane < 0 ? this.leftEdgeDirs : this.rightEdgeDirs ).length);

		result.lane = lane;
	}

	static calculateDirForFanEdge(startVertex, destVertex, dir, rightSided) {
		let dx = destVertex.x - startVertex.x;
		let dz = destVertex.z - startVertex.z;
		let flowVertex = new FlowVertex(startVertex);
		flowVertex.x = dx;
		flowVertex.z = dz;
		flowVertex.normalize();  // todo: remove and test not needed

		// perp
		let multSide = rightSided ? -USE_HANDEDNESS : USE_HANDEDNESS;
		dir.x = -dz*multSide;
		dir.z = dx*multSide;
		dir.normalize(); // <- consider not needed:: remove for production
		dir.offset = dir.x * startVertex.x + dir.z * startVertex.z;

		// flow vertices below
		return rightSided ? [flowVertex, null] :  [null, flowVertex];
	}

}

export { FlowTriangulate, USE_HANDEDNESS };