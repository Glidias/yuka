import { SteeringBehavior } from '../SteeringBehavior.js';
import { FlowAgent } from '../../navigation/navmesh/flowfield/FlowAgent.js';
import { FlowTriangulate } from '../../navigation/navmesh/flowfield/FlowTriangulate.js';
import { Vector3 } from '../../math/Vector3.js';

const desiredVelocity = new Vector3();

/**
* Flowfield behavior through a navmesh
*
* @author Glidias
* @augments SteeringBehavior
*/

class NavMeshFlowFieldBehavior extends SteeringBehavior {

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

		desiredVelocity.x = 0;
		desiredVelocity.z = 0;

		if (!agent.curRegion) {
			this.setCurRegion(vehicle);
			if (!agent.curRegion) {
				force.x = desiredVelocity.x - vehicle.velocity.x;
				force.z = desiredVelocity.z - vehicle.velocity.z;
				return force;
			}
		} else {
			if (!agent.withinCurrentTriangleBounds(vehicle.position)) {
				let region = agent.getCurRegion();
				if ((region.edge.next.next.next !== region.edge && agent.withinCurrentRegionBounds(vehicle.position)) && agent.withinFlowPlane(vehicle.position, this.epsilon) ) {
					// update triangle from triangulation
					agent.curRegion.updateLane(vehicle.position, agent);
					agent.curRegion.updateFlowTriLaned(vehicle.position, agent, this.flowField.edgeFieldMap);

				} else {
					this.setCurRegion(vehicle);
					if (!agent.curRegion) {
						force.x = desiredVelocity.x - vehicle.velocity.x;
						force.z = desiredVelocity.z - vehicle.velocity.z;
						return force;
					}
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
		force.x = desiredVelocity.x - vehicle.velocity.x;
		force.z = desiredVelocity.z - vehicle.velocity.z;
		//force.x = desiredVelocity.x;
		//force.z = desiredVelocity.z;
		return force;
	}

	setCurRegion(vehicle) {
		let agent = vehicle.agent;
		let flowField = this.flowField;
		let lastRegion = agent.getCurRegion();
		agent.curRegion = flowField.navMesh.getRegionForPoint(vehicle.position, this.epsilon);
		if (!agent.curRegion || agent.curRegion === lastRegion) return;
		let lastNodeIndex = lastRegion ? flowField.navMesh.getNodeIndex(lastRegion) : -1;
		console.log(lastNodeIndex + ">>>");
		let edgeFlows = flowField.calcRegionFlow(lastNodeIndex, flowField.navMesh.getNodeIndex(agent.curRegion), this.pathRef, this.finalDestPt);
		if (!edgeFlows) {
			agent.curRegion = null;
			console.log("setCurRegion:: Could not find flow path from current position")
			return;
		}

		// TODO: setup final flow triangulation cases at last node
		if (agent.curRegion.edge.next.next.next === agent.curRegion.edge) { // triangle
			if (edgeFlows.length ===0) {
				agent.curRegion = null;
				console.log("ARRIVED at last triangle region");
				return;
			}
			agent.lane = 0;
			FlowTriangulate.updateTriRegion(agent.curRegion, agent, flowField.edgeFieldMap);
		} else { // non-tri zone
			if (edgeFlows.length === 0) {

				agent.curRegion = null;
				console.log("ARRIVED at last non-tri region")
				return;
			}

			agent.curRegion = flowField.triangulationMap.get(lastNodeIndex >= 0 ?
				agent.curRegion.getEdgeTo(flowField.navMesh.regions[lastNodeIndex]) :
				agent.curRegion.defaultEdge);
			if (!agent.curRegion) {
				agent.curRegion = flowField.setupTriangulation(null, edgeFlows[0]);
			}
			agent.curRegion.updateLane(vehicle.position, agent);
			agent.curRegion.updateFlowTriLaned(vehicle.position, agent, flowField.edgeFieldMap);
		}

	}
}

export { NavMeshFlowFieldBehavior };