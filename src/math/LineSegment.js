import { Vector3 } from './Vector3.js';
import { MathUtils } from './MathUtils.js';

const p1 = new Vector3();
const p2 = new Vector3();

function sqDistBetween2DVector(a, b)
{
	var dx = b.x - a.x;
	var dy = b.z - a.z;
	return dx * dx + dy * dy;
}

function rBetween2DVec(a, b, c)
{
	var dx = b.x - a.x;
	var dy = b.z - a.z;
	var dx2 = c.x - a.x;
	var dy2 = c.z - a.z;
	return dx * dx2 + dy * dy2;
}

/**
* Class representing a 3D line segment.
*
* @author {@link https://github.com/Mugen87|Mugen87}
*/
class LineSegment {

	/**
	* Constructs a new line segment with the given values.
	*
	* @param {Vector3} from - The start point of the line segment.
	* @param {Vector3} to - The end point of the line segment.
	*/
	constructor( from = new Vector3(), to = new Vector3() ) {

		/**
		* The start point of the line segment.
		* @type Vector3
		*/
		this.from = from;

		/**
		* The end point of the line segment.
		* @type Vector3
		*/
		this.to = to;

	}

	/**
	* Sets the given values to this line segment.
	*
	* @param {Vector3} from - The start point of the line segment.
	* @param {Vector3} to - The end point of the line segment.
	* @return {LineSegment} A reference to this line segment.
	*/
	set( from, to ) {

		this.from = from;
		this.to = to;

		return this;

	}

	/**
	* Copies all values from the given line segment to this line segment.
	*
	* @param {LineSegment} lineSegment - The line segment to copy.
	* @return {LineSegment} A reference to this line segment.
	*/
	copy( lineSegment ) {

		this.from.copy( lineSegment.from );
		this.to.copy( lineSegment.to );

		return this;

	}

	/**
	* Creates a new line segment and copies all values from this line segment.
	*
	* @return {LineSegment} A new line segment.
	*/
	clone() {

		return new this.constructor().copy( this );

	}

	/**
	* Computes the difference vector between the end and start point of this
	* line segment and stores the result in the given vector.
	*
	* @param {Vector3} result - The result vector.
	* @return {Vector3} The result vector.
	*/
	delta( result ) {

		return result.subVectors( this.to, this.from );

	}

	/**
	* Computes a position on the line segment according to the given t value
	* and stores the result in the given 3D vector. The t value has usually a range of
	* [0, 1] where 0 means start position and 1 the end position.
	*
	* @param {Number} t - A scalar value representing a position on the line segment.
	* @param {Vector3} result - The result vector.
	* @return {Vector3} The result vector.
	*/
	at( t, result ) {
		return this.delta( result ).multiplyScalar( t ).add( this.from );
	}

	/**
	 * Calculates intersection result with other line segment
	 * @param {LineSegment} other
	 * @param {Object} result Holds r and s result timings. R represents timing of intersection along first line segment, S represents timing along second line segment
	 * @return Whether ray hits
	 */
	getIntersects(other, result = null)
	{
		let a = this.from;
		let b = this.to;
		let c = other.from;
		let d = other.to;
		let denominator = ((b.x - a.x) * (d.z - c.z)) - ((b.z - a.z) * (d.x - c.x));
		let numerator1 = ((a.z - c.z) * (d.x - c.x)) - ((a.x - c.x) * (d.z - c.z));
		let numerator2 = ((a.z - c.z) * (b.x - a.x)) - ((a.x - c.x) * (b.z - a.z));
		let r;
		let s;
		// Detect coincident lines (has a problem, read below)
		if (denominator == 0)
		{
			// find between c and d, which is closer to a, clamp to s to 1 and 0, set r to c/d
			s = sqDistBetween2DVector(a, c) < sqDistBetween2DVector(a, d) ? 0 : 1;
			r = s != 0 ? rBetween2DVec(a, b, d) : rBetween2DVec(a, b, c);
			// throw new Error("DETECT");
			if (result !== null) {
				result.r = r;
				result.s = s;
				result.coincident = true;
			}
			return false; // (r >= 0) && (s >= 0 && s <= 1);
				//  return numerator1 == 0 && numerator2 == 0;
		}

		r = numerator1 / denominator;
		s = numerator2 / denominator;
		if (result !== null) {
			result.r = r;
			result.s = s;
			result.coincident = false;
		}
		//
		return s >= 0 && s <= 1 && r <= 1 && r >= 0;
	}


	/**
	* Computes the closest point on an infinite line defined by the line segment.
	* It's possible to clamp the closest point so it does not exceed the start and
	* end position of the line segment.
	*
	* @param {Vector3} point - A point in 3D space.
	* @param {Boolean} clampToLine - Indicates if the results should be clamped.
	* @param {Vector3} result - The result vector.
	* @return {Vector3} The closest point.
	*/
	closestPointToPoint( point, clampToLine, result ) {

		const t = this.closestPointToPointParameter( point, clampToLine );

		return this.at( t, result );

	}

	/**
	* Computes a scalar value which represents the closest point on an infinite line
	* defined by the line segment. It's possible to clamp this value so it does not
	* exceed the start and end position of the line segment.
	*
	* @param {Vector3} point - A point in 3D space.
	* @param {Boolean} clampToLine - Indicates if the results should be clamped.
	* @return {Number} A scalar representing the closest point.
	*/
	closestPointToPointParameter( point, clampToLine = true ) {

		p1.subVectors( point, this.from );
		p2.subVectors( this.to, this.from );

		const dotP2P2 = p2.dot( p2 );
		const dotP2P1 = p2.dot( p1 );

		let t = dotP2P1 / dotP2P2;

		if ( clampToLine ) t = MathUtils.clamp( t, 0, 1 );

		return t;

	}

	/**
	* Returns true if the given line segment is deep equal with this line segment.
	*
	* @param {LineSegment} lineSegment - The line segment to test.
	* @return {Boolean} The result of the equality test.
	*/
	equals( lineSegment ) {

		return lineSegment.from.equals( this.from ) && lineSegment.to.equals( this.to );

	}

}

export { LineSegment };
