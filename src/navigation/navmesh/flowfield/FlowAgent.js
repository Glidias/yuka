import { FlowVertex } from './FlowVertex.js'
import { Vector3 } from '../../../math/Vector3.js';

const testPt = new Vector3();

class FlowAgent {

	// A navmesh flow agent to manage continuous flowfield movement across navmesh regions for an entity

	// FlowVertex(s) for current triangle
	// a
	// b
	// c

	// curRegion: Polygon

	// prevEdge: {[...FlowVertex, ...FlowVertex]}
	// lastSavedEdge: {...[FlowVertex,... FlowVertex]}

	// curFlowField: NavMeshFlowField

	constructor() {

	}

	/*
	enterNewRegion(region, a, b, c, reset) {

		// check vertex matches from lastSavedEdge
		this.curRegion = region;
		this.a = a;
		this.b = b;
		this.c = c;
		if (reset) {	// breaks continuity from previous edge
			this.prevEdge = null;
			this.lastSavedEdge = null;
		}
	}
	*/

	/**
	 *  Set direction result vector for with a,b,c tri flow vertices from current position
	 * @param {Vector3} pt 	The position of agent
	 * @param {Vector3} dir The result direction vector
	 */
	calcDir(pt, dir) {

	}

	withinFlowPlane(pt, epsilon = 1e-3) {
		// distance to plane test
		return Math.abs( this.curRegion.distanceToPoint( edge.vertex ) ) <= epsilon;
	}

	static pointWithinTriangleBounds(pt, a, b, c) {
		let px = pt.x;
		let py = pt.z;
		// convex test
		return (c.x - px) * (a.z - py) - (a.x - px) * (c.z - py) >= 0 &&
			   (a.x - px) * (b.z - py) - (b.x - px) * (a.z - py) >= 0 &&
			   (b.x - px) * (c.z - py) - (c.x - px) * (b.z - py) >= 0;
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

	withinCurrentRegionBounds(pt) {
		let curRegion = this.curRegion;
		let edge = curRegion.edge;
		// convex test
		do {
			const v1 = edge.tail();
			const v2 = edge.head();

			if ( curRegion.leftOn( v1, v2, point ) === false ) {
				return false;
			}
			edge = edge.next;

		} while ( edge !== this.edge );
	}
}

export { FlowAgent };
