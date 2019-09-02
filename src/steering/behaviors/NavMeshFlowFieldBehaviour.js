import { SteeringBehavior } from '../SteeringBehavior.js';
import { FlowAgent } from '../../navigation/navmesh/flowfield/FlowAgent.js';
import { FlowTriangulate } from '../../navigation/navmesh/flowfield/FlowTriangulate.js';
import { Vector3 } from '../../math/Vector3.js';

const desiredVelocity = new Vector3();

/**
* Flowfield behaviour through a navmesh
*
* @author Glidias
* @augments SteeringBehavior
*/

class NavMeshFlowFieldBehaviour extends SteeringBehavior {

	/**
	 *
	 * @param {NavMeshFlowField} flowField For now, only accepts a persistant NavMeshFLowField
	 */
	constructor(flowField, finalDestPt, pathRef, epsilon = 1e-3) {
		super();
		this.flowField = flowField;
		this.finalDestPt = finalDestPt;
		this.epsilon = epsilon;
		this.pathRef = pathRef;
	}

	onAdded(vehicle) {
		vehicle.agent = new FlowAgent();
	}

	onRemoved(vehicle) {
		vehicle.agent = null;
	}

	calculate( vehicle, force /*, delta */ ) {
		let agent = vehicle.agent;
		if (!agent.curRegion) {
			this.setCurRegion(vehicle);
			if (!agent.curRegion) return force;
		} else {
			if (!agent.withinCurrentTriangleBounds(vehicle.position)) {
				let region = agent.getCurRegion();
				if ((region.edge.next.next.next !== region.edge && agent.withinCurrentRegionBounds(vehicle.position)) && agent.withinFlowPlane(vehicle.position, this.epsilon) ) {
					// update triangle from triangulation
					agent.curRegion.updateLane(vehicle.position, agent);
					agent.curRegion.updateFlowTri(vehicle.position, agent, this.flowField.edgeFieldMap);

				} else {
					this.setCurRegion(vehicle);
					if (!agent.curRegion) return force;
				}
			}
		}

		agent.calcDir(vehicle.position, desiredVelocity);
		// desiredVelocity.multiplyScalar( vehicle.maxSpeed );
		desiredVelocity.x *= vehicle.maxSpeed;
		desiredVelocity.z *= vehicle.maxSpeed;

		// The steering force returned by this method is the force required,
		// which when added to the agent’s current velocity vector gives the desired velocity.
		// To achieve this you simply subtract the agent’s current velocity from the desired velocity.

		//return force.subVectors( desiredVelocity, vehicle.velocity );
		force.x = desiredVelocity.x - velhicle.velocity.x;
		force.z = desiredVelocity.z - vehicle.velocity.z;
		return force;
	}

	setCurRegion(vehicle) {
		let agent = vehicle.agent;
		let flowField = this.flowField;
		let lastRegion = agent.curRegion;
		agent.curRegion = flowField.navMesh.getRegionForPoint(vehicle.position, epsilon);
		if (!agent.curRegion || agent.curRegion === lastRegion) return;
		let lastNodeIndex = lastRegion ? flowField.navMesh.getNodeIndex(lastRegion) : null;
		flowField.calcRegionFlow(lastNodeIndex, flowField.navMesh.getNodeIndex(agent.curRegion), this.pathRef, this.finalDestPt);

		if (agent.curRegion.edge.next.next.next === agent.curRegion.edge) { // triangle
			agent.lane = 0;
			FlowTriangulate.updateTriRegion(agent.curRegion, agent, flowField.edgeFieldMap);
		} else {
			agent.curRegion = flowField.triangulationMap.get(lastNodeIndex !== null ?
				agent.curRegion.getEdgeTo(flowField.navMesh.regions[lastNodeIndex]) :
				agent.curRegion.defaultEdge);
			agent.curRegion.updateLane(vehicle.position, agent);
			agent.curRegion.updateFlowTri(vehicle.position, agent, flowField.edgeFieldMap);
		}

	}
}

export { NavMeshFlowFieldBehaviour };