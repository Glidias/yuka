import { FlowVertex } from './FlowVertex.js'
import { NavMeshFlowField } from './NavmeshFlowField.js'
import { Vector3 } from '../../../math/Vector3.js';

const CALC_VEC = new Vector3();

class FlowAgent {

	// A navmesh flow agent to manage continuous flowfield movement across navmesh regions for a given entity

	// FlowVertex(s) for current triangle
	// a
	// b
	// c
	// curRegion	(FlowTriangulate OR Polygon)

	// prevEdge: {[FlowVertex, FlowVertex]}
	// lastSavedEdge: {[FlowVertex, FlowVertex]}

	constructor() {

	}

	/**
	 * Update direction of agent based off a,b,c flow vertices for agent
	 * @param {Vector3} pt 	The position of agent
	 * @param {Vector3} dir The result direction vector
	 */
	calcDir(pt, dir) {
		let a = this.a.vertex;
		let b = this.b.vertex;
		let c = this.c.vertex;
		let area;
		let sumArea = 0;
		let dx = 0;
		let dz = 0;

		let calcVec;

		/*
		// I J K vertex vectors
		u(q) = (Ai*vqi + Aj*vqj + Ak*vqk)
			  / (Ai + Aj + Ak)
		Where area A`v` corresponds along triangle edge with vertices not incident to `v`
	   */

		// area Ac
		calcVec = this.c;
		area =  ( ( pt.x - a.x ) * ( b.z - a.z ) ) - ( ( b.x - a.x ) * ( pt.z - a.z ) );
		sumArea += area;
		if (calcVec.spinning || (calcVec.splitNormal && calcVec.splitNormal.x * pt.x + calcVec.splitNormal.z * pt.z > calcVec.splitNormal.offset) ) {
			calcVec = CALC_VEC;
			calcVec.x = pt.x - c.x;
			calcVec.z = pt.z - c.z;
			calcVec.normalize();
		}
		dx += area * calcVec.x;
		dz += area * calcVec.z;

		// area Aa
		calcVec = this.a;
		area =  ( ( pt.x - b.x ) * ( c.z - b.z ) ) - ( ( c.x - b.x ) * ( pt.z - b.z ) );
		sumArea += area;
		if (calcVec.spinning || (calcVec.splitNormal && calcVec.splitNormal.x * pt.x + calcVec.splitNormal.z * pt.z > calcVec.splitNormal.offset) ) {
			calcVec = CALC_VEC;
			calcVec.x = pt.x - a.x;
			calcVec.z = pt.z - a.z;
			calcVec.normalize();
		}
		dx += area * calcVec.x;
		dz += area * calcVec.z;

		// area Ab
		calcVec = this.b;
		area =  ( ( pt.x - c.x ) * ( a.z - c.z ) ) - ( ( a.x - c.x ) * ( pt.z - c.z ) );
		sumArea += area;
		if (calcVec.spinning || (calcVec.splitNormal && calcVec.splitNormal.x * pt.x + calcVec.splitNormal.z * pt.z > calcVec.splitNormal.offset) ) {
			calcVec = CALC_VEC;
			calcVec.x = pt.x - b.x;
			calcVec.z = pt.z - b.z;
			calcVec.normalize();
		}
		dx += area * calcVec.x;
		dz += area * calcVec.z;

		dir.x = dx / sumArea;
		// dir.y = 0;
		dir.z = dz / sumArea;
		// dir.normalize();
	}

	reset(clearCurRegion) {
		// TODO: consider reset (this.lane === null BUT !!this.curRegion marker) to update curRegion context and flow vectors
		this.prevEdge = null;
		this.lastSavedEdge = null;
		this.lane = null;
		if (clearCurRegion) {
			this.curRegion = null;
		}
	}

	withinFlowPlane(pt, epsilon = 1e-3) {
		// distance to plane test
		let curRegion = this.curRegion.fromPortal ? this.curRegion.fromPortal.polygon : this.curRegion;
		return Math.abs( curRegion.distanceToPoint( pt ) ) <= epsilon;
	}

	static pointWithinTriangleBounds(pt, a, b, c) {
		let px = pt.x;
		let py = pt.z;
		// convex test
		return (c.x - px) * (a.z - py) - (a.x - px) * (c.z - py) >= 0 &&
			   (a.x - px) * (b.z - py) - (b.x - px) * (a.z - py) >= 0 &&
			   (b.x - px) * (c.z - py) - (c.x - px) * (b.z - py) >= 0;
	}

	currentTriArea() {
		let a = this.a.vertex;
		let b = this.b.vertex;
		let c = this.c.vertex;
		return ( ( c.x - a.x ) * ( b.z - a.z ) ) - ( ( b.x - a.x ) * ( c.z - a.z ) );
	}

	withinCurrentTriangleBounds(pt) {
		let px = pt.x;
		let py = pt.z;
		let a = this.a.vertex;
		let b = this.b.vertex;
		let c = this.c.vertex;
		// convex test
		return (c.x - px) * (a.z - py) - (a.x - px) * (c.z - py) >= 0 &&
			   (a.x - px) * (b.z - py) - (b.x - px) * (a.z - py) >= 0 &&
			   (b.x - px) * (c.z - py) - (c.x - px) * (b.z - py) >= 0;
	}

	getCurRegion() {
		return this.curRegion && this.curRegion.fromPortal ? this.curRegion.fromPortal.polygon : this.curRegion;
	}

	withinCurrentRegionBounds(pt) {
		let curRegion = this.curRegion.fromPortal ? this.curRegion.fromPortal.polygon : this.curRegion;
		let edge = curRegion.edge;
		// convex test
		do {
			const v1 = edge.tail();
			const v2 = edge.head();

			// MathUtils.area( v1, v2, pt ) < 0
			if ( ( ( pt.x - v1.x ) * ( v2.z - v1.z ) ) - ( ( v2.x - v1.x ) * ( pt.z - v1.z ) ) < 0  ) {
				return false;
			}
			edge = edge.next;

		} while ( edge !== curRegion.edge );
	}
}

/*
function leftOn( a, b, c ) {

	return MathUtils.area( a, b, c ) >= 0;

}
*/

export { FlowAgent };
