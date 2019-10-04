
/**
 * @license
 * The MIT License
 * 
 * Copyright © 2019 Yuka authors
 * 
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 * 
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 * 
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 * THE SOFTWARE.
 *
 */

/**
* Class for representing a telegram, an envelope which contains a message
* and certain metadata like sender and receiver. Part of the messaging system
* for game entities.
*
* @author {@link https://github.com/Mugen87|Mugen87}
*/
class Telegram {

	/**
	* Constructs a new telegram object.
	*
	* @param {GameEntity} sender - The sender.
	* @param {GameEntity} receiver - The receiver.
	* @param {String} message - The actual message.
	* @param {Number} delay - A time value in millisecond used to delay the message dispatching.
	* @param {Object} data - An object for custom data.
	*/
	constructor( sender, receiver, message, delay, data ) {

		/**
		* The sender.
		* @type GameEntity
		*/
		this.sender = sender;

		/**
		* The receiver.
		* @type GameEntity
		*/
		this.receiver = receiver;

		/**
		* The actual message.
		* @type String
		*/
		this.message = message;

		/**
		* A time value in millisecond used to delay the message dispatching.
		* @type Number
		*/
		this.delay = delay;

		/**
		* An object for custom data.
		* @type Object
		*/
		this.data = data;

	}

	/**
	* Transforms this instance into a JSON object.
	*
	* @return {Object} The JSON object.
	*/
	toJSON() {

		return {
			type: this.constructor.name,
			sender: this.sender ? this.sender.uuid : null,
			receiver: this.receiver ? this.receiver.uuid : null,
			message: this.message,
			delay: this.delay,
			data: this.data
		};

	}

	/**
	* Restores this instance from the given JSON object.
	*
	* @param {Object} json - The JSON object.
	* @return {Telegram} A reference to this telegram.
	*/
	fromJSON( json ) {

		this.sender = json.sender;
		this.receiver = json.receiver;
		this.message = json.message;
		this.delay = json.delay;
		this.data = json.data;

		return this;

	}

	/**
	* Restores UUIDs with references to GameEntity objects.
	*
	* @param {Map} entities - Maps game entities to UUIDs.
	* @return {Telegram} A reference to this telegram.
	*/
	resolveReferences( entities ) {

		this.sender = entities.get( this.sender );
		this.receiver = entities.get( this.receiver );

		return this;

	}

}

/* istanbul ignore next */

/**
* Class with a logger interface. Messages are only logged to console if
* their log level is smaller or equal than the current log level.
*
* @author {@link https://github.com/Mugen87|Mugen87}
*/
class Logger {

	/**
	* Sets the log level for the logger. Allow values are: *LOG*,
	* *WARN*, *ERROR*, *SILENT*. The default level is *WARN*. The constants
	* are accessible over the *Logger.LEVEL* namespace.
	*
	* @param {Number} level - The log level.
	*/
	static setLevel( level ) {

		currentLevel = level;

	}

	/**
	* Logs a message with the level *LOG*.
	*
	* @param {...Any} args - The arguments to log.
	*/
	static log( ...args ) {

		if ( currentLevel <= Logger.LEVEL.LOG ) console.log( ...args );

	}

	/**
	* Logs a message with the level *WARN*.
	*
	* @param {...Any} args - The arguments to log.
	*/
	static warn( ...args ) {

		if ( currentLevel <= Logger.LEVEL.WARN ) console.warn( ...args );

	}

	/**
	* Logs a message with the level *ERROR*.
	*
	* @param {...Any} args - The arguments to log.
	*/
	static error( ...args ) {

		if ( currentLevel <= Logger.LEVEL.ERROR ) console.error( ...args );

	}

}

Logger.LEVEL = Object.freeze( {
	LOG: 0,
	WARN: 1,
	ERROR: 2,
	SILENT: 3
} );

let currentLevel = Logger.LEVEL.WARN;

/**
* This class is the core of the messaging system for game entities and used by the
* {@link EntityManager}. The implementation can directly dispatch messages or use a
* delayed delivery for deferred communication. This can be useful if a game entity
* wants to inform itself about a particular event in the future.
*
* @author {@link https://github.com/Mugen87|Mugen87}
*/
class MessageDispatcher {

	/**
	* Constructs a new message dispatcher.
	*/
	constructor() {

		/**
		* A list of delayed telegrams.
		* @type Array
		*/
		this.delayedTelegrams = new Array();

	}

	/**
	* Delivers the message to the receiver.
	*
	* @param {Telegram} telegram - The telegram to deliver.
	* @return {MessageDispatcher} A reference to this message dispatcher.
	*/
	deliver( telegram ) {

		const receiver = telegram.receiver;

		if ( receiver.handleMessage( telegram ) === false ) {

			Logger.warn( 'YUKA.MessageDispatcher: Message not handled by receiver: %o', receiver );

		}

		return this;

	}

	/**
	* Receives the raw telegram data and decides how to dispatch the telegram (with or without delay).
	*
	* @param {GameEntity} sender - The sender.
	* @param {GameEntity} receiver - The receiver.
	* @param {String} message - The actual message.
	* @param {Number} delay - A time value in millisecond used to delay the message dispatching.
	* @param {Object} data - An object for custom data.
	* @return {MessageDispatcher} A reference to this message dispatcher.
	*/
	dispatch( sender, receiver, message, delay, data ) {

		const telegram = new Telegram( sender, receiver, message, delay, data );

		if ( delay <= 0 ) {

			this.deliver( telegram );

		} else {

			this.delayedTelegrams.push( telegram );

		}

		return this;

	}

	/**
	* Used to process delayed messages.
	*
	* @param {Number} delta - The time delta.
	* @return {MessageDispatcher} A reference to this message dispatcher.
	*/
	dispatchDelayedMessages( delta ) {

		let i = this.delayedTelegrams.length;

		while ( i -- ) {

			const telegram = this.delayedTelegrams[ i ];

			telegram.delay -= delta;

			if ( telegram.delay <= 0 ) {

				this.deliver( telegram );

				this.delayedTelegrams.pop();

			}

		}

		return this;

	}

	/**
	* Clears the internal state of this message dispatcher.
	*
	* @return {MessageDispatcher} A reference to this message dispatcher.
	*/
	clear() {

		this.delayedTelegrams.length = 0;

		return this;

	}

	/**
	* Transforms this instance into a JSON object.
	*
	* @return {Object} The JSON object.
	*/
	toJSON() {

		const data = {
			type: this.constructor.name,
			delayedTelegrams: new Array()
		};

		// delayed telegrams

		for ( let i = 0, l = this.delayedTelegrams.length; i < l; i ++ ) {

			const delayedTelegram = this.delayedTelegrams[ i ];
			data.delayedTelegrams.push( delayedTelegram.toJSON() );

		}

		return data;

	}

	/**
	* Restores this instance from the given JSON object.
	*
	* @param {Object} json - The JSON object.
	* @return {MessageDispatcher} A reference to this message dispatcher.
	*/
	fromJSON( json ) {

		this.clear();

		const telegramsJSON = json.delayedTelegrams;

		for ( let i = 0, l = telegramsJSON.length; i < l; i ++ ) {

			const telegramJSON = telegramsJSON[ i ];
			const telegram = new Telegram().fromJSON( telegramJSON );

			this.delayedTelegrams.push( telegram );

		}

		return this;

	}


	/**
	* Restores UUIDs with references to GameEntity objects.
	*
	* @param {Map} entities - Maps game entities to UUIDs.
	* @return {MessageDispatcher} A reference to this message dispatcher.
	*/
	resolveReferences( entities ) {

		const delayedTelegrams = this.delayedTelegrams;

		for ( let i = 0, l = delayedTelegrams.length; i < l; i ++ ) {

			const delayedTelegram = delayedTelegrams[ i ];
			delayedTelegram.resolveReferences( entities );

		}

		return this;

	}

}

const lut = new Array();

for ( let i = 0; i < 256; i ++ ) {

	lut[ i ] = ( i < 16 ? '0' : '' ) + ( i ).toString( 16 );

}

/**
* Class with various math helpers.
*
* @author {@link https://github.com/Mugen87|Mugen87}
*/
class MathUtils {

	/**
	* Ensures the given scalar value is within a given min/max range.
	*
	* @param {Number} value - The value to clamp.
	* @param {min} value - The min value.
	* @param {max} value - The max value.
	* @return {Number} The clamped value.
	*/
	static clamp( value, min, max ) {

		return Math.max( min, Math.min( max, value ) );

	}

	/**
	* Computes a random integer value within a given min/max range.
	*
	* @param {min} value - The min value.
	* @param {max} value - The max value.
	* @return {Number} The random integer value.
	*/
	static randInt( min, max ) {

		return min + Math.floor( Math.random() * ( max - min + 1 ) );

	}

	/**
	* Computes a random float value within a given min/max range.
	*
	* @param {min} value - The min value.
	* @param {max} value - The max value.
	* @return {Number} The random float value.
	*/
	static randFloat( min, max ) {

		return min + Math.random() * ( max - min );

	}

	/**
	* Computes the signed area of a rectangle defined by three points.
	* This method can also be used to calculate the area of a triangle.
	*
	* @param {Vector3} a - The first point in 3D space.
	* @param {Vector3} b - The second point in 3D space.
	* @param {Vector3} c - The third point in 3D space.
	* @return {Number} The signed area.
	*/
	static area( a, b, c ) {

		return ( ( c.x - a.x ) * ( b.z - a.z ) ) - ( ( b.x - a.x ) * ( c.z - a.z ) );

	}

	/**
	* Computes a RFC4122 Version 4 complied Universally Unique Identifier (UUID).
	*
	* @return {String} The UUID.
	*/
	static generateUUID() {

		// https://stackoverflow.com/questions/105034/create-guid-uuid-in-javascript/21963136#21963136

		const d0 = Math.random() * 0xffffffff | 0;
		const d1 = Math.random() * 0xffffffff | 0;
		const d2 = Math.random() * 0xffffffff | 0;
		const d3 = Math.random() * 0xffffffff | 0;
		const uuid = lut[ d0 & 0xff ] + lut[ d0 >> 8 & 0xff ] + lut[ d0 >> 16 & 0xff ] + lut[ d0 >> 24 & 0xff ] + '-' +
			lut[ d1 & 0xff ] + lut[ d1 >> 8 & 0xff ] + '-' + lut[ d1 >> 16 & 0x0f | 0x40 ] + lut[ d1 >> 24 & 0xff ] + '-' +
			lut[ d2 & 0x3f | 0x80 ] + lut[ d2 >> 8 & 0xff ] + '-' + lut[ d2 >> 16 & 0xff ] + lut[ d2 >> 24 & 0xff ] +
			lut[ d3 & 0xff ] + lut[ d3 >> 8 & 0xff ] + lut[ d3 >> 16 & 0xff ] + lut[ d3 >> 24 & 0xff ];

		return uuid.toUpperCase();

	}

}

/**
* Class representing a 3D vector.
*
* @author {@link https://github.com/Mugen87|Mugen87}
*/
class Vector3 {

	/**
	* Constructs a new 3D vector with the given values.
	*
	* @param {Number} x - The x component.
	* @param {Number} y - The y component.
	* @param {Number} z - The z component.
	*/
	constructor( x = 0, y = 0, z = 0 ) {

		/**
		* The x component.
		* @type Number
		*/
		this.x = x;

		/**
		* The y component.
		* @type Number
		*/
		this.y = y;

		/**
		* The z component.
		* @type Number
		*/
		this.z = z;

	}

	/**
	* Sets the given values to this 3D vector.
	*
	* @param {Number} x - The x component.
	* @param {Number} y - The y component.
	* @param {Number} z - The z component.
	* @return {Vector3} A reference to this vector.
	*/
	set( x, y, z ) {

		this.x = x;
		this.y = y;
		this.z = z;

		return this;

	}

	/**
	* Copies all values from the given 3D vector to this 3D vector.
	*
	* @param {Vector3} v - The vector to copy.
	* @return {Vector3} A reference to this vector.
	*/
	copy( v ) {

		this.x = v.x;
		this.y = v.y;
		this.z = v.z;

		return this;

	}

	/**
	* Creates a new 3D vector and copies all values from this 3D vector.
	*
	* @return {Vector3} A new 3D vector.
	*/
	clone() {

		return new this.constructor().copy( this );

	}

	/**
	* Adds the given 3D vector to this 3D vector.
	*
	* @param {Vector3} v - The vector to add.
	* @return {Vector3} A reference to this vector.
	*/
	add( v ) {

		this.x += v.x;
		this.y += v.y;
		this.z += v.z;

		return this;

	}

	/**
	* Adds the given scalar to this 3D vector.
	*
	* @param {Number} s - The scalar to add.
	* @return {Vector3} A reference to this vector.
	*/
	addScalar( s ) {

		this.x += s;
		this.y += s;
		this.z += s;

		return this;

	}

	/**
	* Adds two given 3D vectors and stores the result in this 3D vector.
	*
	* @param {Vector3} a - The first vector of the operation.
	* @param {Vector3} b - The second vector of the operation.
	* @return {Vector3} A reference to this vector.
	*/
	addVectors( a, b ) {

		this.x = a.x + b.x;
		this.y = a.y + b.y;
		this.z = a.z + b.z;

		return this;

	}

	/**
	* Subtracts the given 3D vector from this 3D vector.
	*
	* @param {Vector3} v - The vector to substract.
	* @return {Vector3} A reference to this vector.
	*/
	sub( v ) {

		this.x -= v.x;
		this.y -= v.y;
		this.z -= v.z;

		return this;

	}

	/**
	* Subtracts the given scalar from this 3D vector.
	*
	* @param {Number} s - The scalar to substract.
	* @return {Vector3} A reference to this vector.
	*/
	subScalar( s ) {

		this.x -= s;
		this.y -= s;
		this.z -= s;

		return this;

	}

	/**
	* Subtracts two given 3D vectors and stores the result in this 3D vector.
	*
	* @param {Vector3} a - The first vector of the operation.
	* @param {Vector3} b - The second vector of the operation.
	* @return {Vector3} A reference to this vector.
	*/
	subVectors( a, b ) {

		this.x = a.x - b.x;
		this.y = a.y - b.y;
		this.z = a.z - b.z;

		return this;

	}

	/**
	* Multiplies the given 3D vector with this 3D vector.
	*
	* @param {Vector3} v - The vector to multiply.
	* @return {Vector3} A reference to this vector.
	*/
	multiply( v ) {

		this.x *= v.x;
		this.y *= v.y;
		this.z *= v.z;

		return this;

	}

	/**
	* Multiplies the given scalar with this 3D vector.
	*
	* @param {Number} s - The scalar to multiply.
	* @return {Vector3} A reference to this vector.
	*/
	multiplyScalar( s ) {

		this.x *= s;
		this.y *= s;
		this.z *= s;

		return this;

	}

	/**
	* Multiplies two given 3D vectors and stores the result in this 3D vector.
	*
	* @param {Vector3} a - The first vector of the operation.
	* @param {Vector3} b - The second vector of the operation.
	* @return {Vector3} A reference to this vector.
	*/
	multiplyVectors( a, b ) {

		this.x = a.x * b.x;
		this.y = a.y * b.y;
		this.z = a.z * b.z;

		return this;

	}

	/**
	* Divides the given 3D vector through this 3D vector.
	*
	* @param {Vector3} v - The vector to divide.
	* @return {Vector3} A reference to this vector.
	*/
	divide( v ) {

		this.x /= v.x;
		this.y /= v.y;
		this.z /= v.z;

		return this;

	}

	/**
	* Divides the given scalar through this 3D vector.
	*
	* @param {Number} s - The scalar to multiply.
	* @return {Vector3} A reference to this vector.
	*/
	divideScalar( s ) {

		this.x /= s;
		this.y /= s;
		this.z /= s;

		return this;

	}

	/**
	* Divides two given 3D vectors and stores the result in this 3D vector.
	*
	* @param {Vector3} a - The first vector of the operation.
	* @param {Vector3} b - The second vector of the operation.
	* @return {Vector3} A reference to this vector.
	*/
	divideVectors( a, b ) {

		this.x = a.x / b.x;
		this.y = a.y / b.y;
		this.z = a.z / b.z;

		return this;

	}

	/**
	* Reflects this vector along the given normal.
	*
	* @param {Vector3} normal - The normal vector.
	* @return {Vector3} A reference to this vector.
	*/
	reflect( normal ) {

		// solve r = v - 2( v * n ) * n

		return this.sub( v1.copy( normal ).multiplyScalar( 2 * this.dot( normal ) ) );

	}

	/**
	* Ensures this 3D vector lies in the given min/max range.
	*
	* @param {Vector3} min - The min range.
	* @param {Vector3} max - The max range.
	* @return {Vector3} A reference to this vector.
	*/
	clamp( min, max ) {

		this.x = Math.max( min.x, Math.min( max.x, this.x ) );
		this.y = Math.max( min.y, Math.min( max.y, this.y ) );
		this.z = Math.max( min.z, Math.min( max.z, this.z ) );

		return this;

	}

	/**
	* Compares each vector component of this 3D vector and the
	* given one and stores the minimum value in this instance.
	*
	* @param {Vector3} v - The 3D vector to check.
	* @return {Vector3} A reference to this vector.
	*/
	min( v ) {

		this.x = Math.min( this.x, v.x );
		this.y = Math.min( this.y, v.y );
		this.z = Math.min( this.z, v.z );

		return this;

	}

	/**
	* Compares each vector component of this 3D vector and the
	* given one and stores the maximum value in this instance.
	*
	* @param {Vector3} v - The 3D vector to check.
	* @return {Vector3} A reference to this vector.
	*/
	max( v ) {

		this.x = Math.max( this.x, v.x );
		this.y = Math.max( this.y, v.y );
		this.z = Math.max( this.z, v.z );

		return this;

	}

	/**
	* Computes the dot product of this and the given 3D vector.
	*
	* @param {Vector3} v - The given 3D vector.
	* @return {Number} The results of the dor product.
	*/
	dot( v ) {

		return ( this.x * v.x ) + ( this.y * v.y ) + ( this.z * v.z );

	}

	/**
	* Computes the cross product of this and the given 3D vector and
	* stores the result in this 3D vector.
	*
	* @param {Vector3} v - A 3D vector.
	* @return {Vector3} A reference to this vector.
	*/
	cross( v ) {

		const x = this.x, y = this.y, z = this.z;

		this.x = ( y * v.z ) - ( z * v.y );
		this.y = ( z * v.x ) - ( x * v.z );
		this.z = ( x * v.y ) - ( y * v.x );

		return this;

	}

	/**
	* Computes the cross product of the two given 3D vectors and
	* stores the result in this 3D vector.
	*
	* @param {Vector3} a - The first 3D vector.
	* @param {Vector3} b - The second 3D vector.
	* @return {Vector3} A reference to this vector.
	*/
	crossVectors( a, b ) {

		const ax = a.x, ay = a.y, az = a.z;
		const bx = b.x, by = b.y, bz = b.z;

		this.x = ( ay * bz ) - ( az * by );
		this.y = ( az * bx ) - ( ax * bz );
		this.z = ( ax * by ) - ( ay * bx );

		return this;

	}

	/**
	* Computes the angle between this and the given vector.
	*
	* @param {Vector3} v - A 3D vector.
	* @return {Number} The angle in radians.
	*/
	angleTo( v ) {

		const theta = this.dot( v ) / ( Math.sqrt( this.squaredLength() * v.squaredLength() ) );

		// clamp, to handle numerical problems

		return Math.acos( MathUtils.clamp( theta, - 1, 1 ) );

	}

	/**
	* Computes the length of this 3D vector.
	*
	* @return {Number} The length of this 3D vector.
	*/
	length() {

		return Math.sqrt( this.squaredLength() );

	}

	/**
	* Computes the squared length of this 3D vector.
	* Calling this method is faster than calling {@link Vector3#length},
	* since it avoids computing a square root.
	*
	* @return {Number} The squared length of this 3D vector.
	*/
	squaredLength() {

		return this.dot( this );

	}

	/**
	* Computes the manhattan length of this 3D vector.
	*
	* @return {Number} The manhattan length of this 3D vector.
	*/
	manhattanLength() {

		return Math.abs( this.x ) + Math.abs( this.y ) + Math.abs( this.z );

	}

	/**
	* Computes the euclidean distance between this 3D vector and the given one.
	*
	* @param {Vector3} v - A 3D vector.
	* @return {Number} The euclidean distance between two 3D vectors.
	*/
	distanceTo( v ) {

		return Math.sqrt( this.squaredDistanceTo( v ) );

	}

	/**
	* Computes the squared euclidean distance between this 3D vector and the given one.
	* Calling this method is faster than calling {@link Vector3#distanceTo},
	* since it avoids computing a square root.
	*
	* @param {Vector3} v - A 3D vector.
	* @return {Number} The squared euclidean distance between two 3D vectors.
	*/
	squaredDistanceTo( v ) {

		const dx = this.x - v.x, dy = this.y - v.y, dz = this.z - v.z;

		return ( dx * dx ) + ( dy * dy ) + ( dz * dz );

	}

	/**
	* Computes the manhattan distance between this 3D vector and the given one.
	*
	* @param {Vector3} v - A 3D vector.
	* @return {Number} The manhattan distance between two 3D vectors.
	*/
	manhattanDistanceTo( v ) {

		const dx = this.x - v.x, dy = this.y - v.y, dz = this.z - v.z;

		return Math.abs( dx ) + Math.abs( dy ) + Math.abs( dz );

	}

	/**
	* Normalizes this 3D vector.
	*
	* @return {Vector3} A reference to this vector.
	*/
	normalize() {

		return this.divideScalar( this.length() || 1 );

	}

	/**
	* Multiplies the given 4x4 matrix with this 3D vector
	*
	* @param {Matrix4} m - A 4x4 matrix.
	* @return {Vector3} A reference to this vector.
	*/
	applyMatrix4( m ) {

		const x = this.x, y = this.y, z = this.z;
		const e = m.elements;

		const w = 1 / ( ( e[ 3 ] * x ) + ( e[ 7 ] * y ) + ( e[ 11 ] * z ) + e[ 15 ] );

		this.x = ( ( e[ 0 ] * x ) + ( e[ 4 ] * y ) + ( e[ 8 ] * z ) + e[ 12 ] ) * w;
		this.y = ( ( e[ 1 ] * x ) + ( e[ 5 ] * y ) + ( e[ 9 ] * z ) + e[ 13 ] ) * w;
		this.z = ( ( e[ 2 ] * x ) + ( e[ 6 ] * y ) + ( e[ 10 ] * z ) + e[ 14 ] ) * w;

		return this;

	}

	/**
	* Multiplies the given quaternion with this 3D vector.
	*
	* @param {Quaternion} q - A quaternion.
	* @return {Vector3} A reference to this vector.
	*/
	applyRotation( q ) {

		const x = this.x, y = this.y, z = this.z;
		const qx = q.x, qy = q.y, qz = q.z, qw = q.w;

		// calculate quat * vector

		const ix = qw * x + qy * z - qz * y;
		const iy = qw * y + qz * x - qx * z;
		const iz = qw * z + qx * y - qy * x;
		const iw = - qx * x - qy * y - qz * z;

		// calculate result * inverse quat

		this.x = ix * qw + iw * - qx + iy * - qz - iz * - qy;
		this.y = iy * qw + iw * - qy + iz * - qx - ix * - qz;
		this.z = iz * qw + iw * - qz + ix * - qy - iy * - qx;

		return this;

	}

	/**
	* Extracts the position portion of the given 4x4 matrix and stores it in this 3D vector.
	*
	* @param {Matrix4} m - A 4x4 matrix.
	* @return {Vector3} A reference to this vector.
	*/
	extractPositionFromMatrix( m ) {

		const e = m.elements;

		this.x = e[ 12 ];
		this.y = e[ 13 ];
		this.z = e[ 14 ];

		return this;

	}

	/**
	* Transform this direction vector by the given 4x4 matrix.
	*
	* @param {Matrix4} m - A 4x4 matrix.
	* @return {Vector3} A reference to this vector.
	*/
	transformDirection( m ) {

		const x = this.x, y = this.y, z = this.z;
		const e = m.elements;

		this.x = e[ 0 ] * x + e[ 4 ] * y + e[ 8 ] * z;
		this.y = e[ 1 ] * x + e[ 5 ] * y + e[ 9 ] * z;
		this.z = e[ 2 ] * x + e[ 6 ] * y + e[ 10 ] * z;

		return this.normalize();

	}

	/**
	* Sets the components of this 3D vector from a column of a 3x3 matrix.
	*
	* @param {Matrix3} m - A 3x3 matrix.
	* @param {Number} i - The index of the column.
	* @return {Vector3} A reference to this vector.
	*/
	fromMatrix3Column( m, i ) {

		return this.fromArray( m.elements, i * 3 );

	}

	/**
	* Sets the components of this 3D vector from a column of a 4x4 matrix.
	*
	* @param {Matrix3} m - A 4x4 matrix.
	* @param {Number} i - The index of the column.
	* @return {Vector3} A reference to this vector.
	*/
	fromMatrix4Column( m, i ) {

		return this.fromArray( m.elements, i * 4 );

	}

	/**
	* Sets the components of this 3D vector from a spherical coordinate.
	*
	* @param {Number} radius - The radius.
	* @param {Number} phi - The polar or inclination angle in radians. Should be in the range of (−π/2, +π/2].
	* @param {Number} theta - The azimuthal angle in radians. Should be in the range of (−π, +π].
	* @return {Vector3} A reference to this vector.
	*/
	fromSpherical( radius, phi, theta ) {

		const sinPhiRadius = Math.sin( phi ) * radius;

		this.x = sinPhiRadius * Math.sin( theta );
		this.y = Math.cos( phi ) * radius;
		this.z = sinPhiRadius * Math.cos( theta );

		return this;

	}

	/**
	* Sets the components of this 3D vector from an array.
	*
	* @param {Array} array - An array.
	* @param {Number} offset - An optional offset.
	* @return {Vector3} A reference to this vector.
	*/
	fromArray( array, offset = 0 ) {

		this.x = array[ offset + 0 ];
		this.y = array[ offset + 1 ];
		this.z = array[ offset + 2 ];

		return this;

	}

	/**
	* Copies all values of this 3D vector to the given array.
	*
	* @param {Array} array - An array.
	* @param {Number} offset - An optional offset.
	* @return {Array} The array with the 3D vector components.
	*/
	toArray( array, offset = 0 ) {

		array[ offset + 0 ] = this.x;
		array[ offset + 1 ] = this.y;
		array[ offset + 2 ] = this.z;

		return array;

	}

	/**
	* Returns true if the given 3D vector is deep equal with this 3D vector.
	*
	* @param {Vector3} v - The 3D vector to test.
	* @return {Boolean} The result of the equality test.
	*/
	equals( v ) {

		return ( ( v.x === this.x ) && ( v.y === this.y ) && ( v.z === this.z ) );

	}

}

const v1 = new Vector3();

const WorldUp = new Vector3( 0, 1, 0 );

const localRight = new Vector3();
const worldRight = new Vector3();
const perpWorldUp = new Vector3();
const temp = new Vector3();

const colVal = [ 2, 2, 1 ];
const rowVal = [ 1, 0, 0 ];

/**
* Class representing a 3x3 matrix. The elements of the matrix
* are stored in column-major order.
*
* @author {@link https://github.com/Mugen87|Mugen87}
*/
class Matrix3 {

	/**
	* Constructs a new 3x3 identity matrix.
	*/
	constructor() {

		/**
		* The elements of the matrix in column-major order.
		* @type Array
		*/
		this.elements = [

			1, 0, 0,
			0, 1, 0,
			0, 0, 1

		];

	}

	/**
	* Sets the given values to this matrix. The arguments are in row-major order.
	*
	* @param {Number} n11 - An element of the matrix.
	* @param {Number} n12 - An element of the matrix.
	* @param {Number} n13 - An element of the matrix.
	* @param {Number} n21 - An element of the matrix.
	* @param {Number} n22 - An element of the matrix.
	* @param {Number} n23 - An element of the matrix.
	* @param {Number} n31 - An element of the matrix.
	* @param {Number} n32 - An element of the matrix.
	* @param {Number} n33 - An element of the matrix.
	* @return {Matrix3} A reference to this matrix.
	*/
	set( n11, n12, n13, n21, n22, n23, n31, n32, n33 ) {

		const e = this.elements;

		e[ 0 ] = n11; e[ 3 ] = n12; e[ 6 ] = n13;
		e[ 1 ] = n21; e[ 4 ] = n22; e[ 7 ] = n23;
		e[ 2 ] = n31; e[ 5 ] = n32; e[ 8 ] = n33;

		return this;

	}

	/**
	* Copies all values from the given matrix to this matrix.
	*
	* @param {Matrix3} m - The matrix to copy.
	* @return {Matrix3} A reference to this matrix.
	*/
	copy( m ) {

		const e = this.elements;
		const me = m.elements;

		e[ 0 ] = me[ 0 ]; e[ 1 ] = me[ 1 ]; e[ 2 ] = me[ 2 ];
		e[ 3 ] = me[ 3 ]; e[ 4 ] = me[ 4 ]; e[ 5 ] = me[ 5 ];
		e[ 6 ] = me[ 6 ]; e[ 7 ] = me[ 7 ]; e[ 8 ] = me[ 8 ];

		return this;

	}

	/**
	* Creates a new matrix and copies all values from this matrix.
	*
	* @return {Matrix3} A new matrix.
	*/
	clone() {

		return new this.constructor().copy( this );

	}

	/**
	* Transforms this matrix to an identity matrix.
	*
	* @return {Matrix3} A reference to this matrix.
	*/
	identity() {

		this.set(

			1, 0, 0,
			0, 1, 0,
			0, 0, 1

		);

		return this;

	}

	/**
	* Multiplies this matrix with the given matrix.
	*
	* @param {Matrix3} m - The matrix to multiply.
	* @return {Matrix3} A reference to this matrix.
	*/
	multiply( m ) {

		return this.multiplyMatrices( this, m );

	}

	/**
	* Multiplies this matrix with the given matrix.
	* So the order of the multiplication is switched compared to {@link Matrix3#multiply}.
	*
	* @param {Matrix3} m - The matrix to multiply.
	* @return {Matrix3} A reference to this matrix.
	*/
	premultiply( m ) {

		return this.multiplyMatrices( m, this );

	}

	/**
	* Multiplies two given matrices and stores the result in this matrix.
	*
	* @param {Matrix3} a - The first matrix of the operation.
	* @param {Matrix3} b - The second matrix of the operation.
	* @return {Matrix3} A reference to this matrix.
	*/
	multiplyMatrices( a, b ) {

		const ae = a.elements;
		const be = b.elements;
		const e = this.elements;

		const a11 = ae[ 0 ], a12 = ae[ 3 ], a13 = ae[ 6 ];
		const a21 = ae[ 1 ], a22 = ae[ 4 ], a23 = ae[ 7 ];
		const a31 = ae[ 2 ], a32 = ae[ 5 ], a33 = ae[ 8 ];

		const b11 = be[ 0 ], b12 = be[ 3 ], b13 = be[ 6 ];
		const b21 = be[ 1 ], b22 = be[ 4 ], b23 = be[ 7 ];
		const b31 = be[ 2 ], b32 = be[ 5 ], b33 = be[ 8 ];

		e[ 0 ] = a11 * b11 + a12 * b21 + a13 * b31;
		e[ 3 ] = a11 * b12 + a12 * b22 + a13 * b32;
		e[ 6 ] = a11 * b13 + a12 * b23 + a13 * b33;

		e[ 1 ] = a21 * b11 + a22 * b21 + a23 * b31;
		e[ 4 ] = a21 * b12 + a22 * b22 + a23 * b32;
		e[ 7 ] = a21 * b13 + a22 * b23 + a23 * b33;

		e[ 2 ] = a31 * b11 + a32 * b21 + a33 * b31;
		e[ 5 ] = a31 * b12 + a32 * b22 + a33 * b32;
		e[ 8 ] = a31 * b13 + a32 * b23 + a33 * b33;

		return this;

	}

	/**
	* Multiplies the given scalar with this matrix.
	*
	* @param {Number} s - The scalar to multiply.
	* @return {Matrix3} A reference to this matrix.
	*/
	multiplyScalar( s ) {

		const e = this.elements;

		e[ 0 ] *= s; e[ 3 ] *= s; e[ 6 ] *= s;
		e[ 1 ] *= s; e[ 4 ] *= s; e[ 7 ] *= s;
		e[ 2 ] *= s; e[ 5 ] *= s; e[ 8 ] *= s;

		return this;

	}

	/**
	* Extracts the basis vectors and stores them to the given vectors.
	*
	* @param {Vector3} xAxis - The first result vector for the x-axis.
	* @param {Vector3} yAxis - The second result vector for the y-axis.
	* @param {Vector3} zAxis - The third result vector for the z-axis.
	* @return {Matrix3} A reference to this matrix.
	*/
	extractBasis( xAxis, yAxis, zAxis ) {

		xAxis.fromMatrix3Column( this, 0 );
		yAxis.fromMatrix3Column( this, 1 );
		zAxis.fromMatrix3Column( this, 2 );

		return this;

	}

	/**
	* Makes a basis from the given vectors.
	*
	* @param {Vector3} xAxis - The first basis vector for the x-axis.
	* @param {Vector3} yAxis - The second basis vector for the y-axis.
	* @param {Vector3} zAxis - The third basis vector for the z-axis.
	* @return {Matrix3} A reference to this matrix.
	*/
	makeBasis( xAxis, yAxis, zAxis ) {

		this.set(
			xAxis.x, yAxis.x, zAxis.x,
			xAxis.y, yAxis.y, zAxis.y,
			xAxis.z, yAxis.z, zAxis.z
		);

		return this;

	}

	/**
	* Creates a rotation matrix that orients an object to face towards a specified target direction.
	*
	* @param {Vector3} localForward - Specifies the forward direction in the local space of the object.
	* @param {Vector3} targetDirection - Specifies the desired world space direction the object should look at.
	* @param {Vector3} localUp - Specifies the up direction in the local space of the object.
	* @return {Matrix3} A reference to this matrix.
	*/
	lookAt( localForward, targetDirection, localUp ) {

		localRight.crossVectors( localUp, localForward ).normalize();

		// orthonormal linear basis A { localRight, localUp, localForward } for the object local space

		worldRight.crossVectors( WorldUp, targetDirection ).normalize();

		if ( worldRight.squaredLength() === 0 ) {

			// handle case when it's not possible to build a basis from targetDirection and worldUp
			// slightly shift targetDirection in order to avoid collinearity

			temp.copy( targetDirection ).addScalar( Number.EPSILON );
			worldRight.crossVectors( WorldUp, temp ).normalize();

		}

		perpWorldUp.crossVectors( targetDirection, worldRight ).normalize();

		// orthonormal linear basis B { worldRight, perpWorldUp, targetDirection } for the desired target orientation

		m1.makeBasis( worldRight, perpWorldUp, targetDirection );
		m2.makeBasis( localRight, localUp, localForward );

		// construct a matrix that maps basis A to B

		this.multiplyMatrices( m1, m2.transpose() );

		return this;

	}

	/**
	* Transposes this matrix.
	*
	* @return {Matrix3} A reference to this matrix.
	*/
	transpose() {

		const e = this.elements;
		let t;

		t = e[ 1 ]; e[ 1 ] = e[ 3 ]; e[ 3 ] = t;
		t = e[ 2 ]; e[ 2 ] = e[ 6 ]; e[ 6 ] = t;
		t = e[ 5 ]; e[ 5 ] = e[ 7 ]; e[ 7 ] = t;

		return this;

	}

	/**
	* Computes the element index according to the given column and row.
	*
	* @param {Number} column - Index of the column.
	* @param {Number} row - Index of the row.
	* @return {Number} The index of the element at the provided row and column.
	*/
	getElementIndex( column, row ) {

		return column * 3 + row;

	}

	/**
	* Computes the frobenius norm. It's the squareroot of the sum of all
	* squared matrix elements.
	*
	* @return {Number} The frobenius norm.
	*/
	frobeniusNorm() {

		const e = this.elements;
		let norm = 0;

		for ( let i = 0; i < 9; i ++ ) {

			norm += e[ i ] * e[ i ];

		}

		return Math.sqrt( norm );

	}

	/**
	* Computes the  "off-diagonal" frobenius norm. Assumes the matrix is symmetric.
	*
	* @return {Number} The "off-diagonal" frobenius norm.
	*/
	offDiagonalFrobeniusNorm() {

		const e = this.elements;
		let norm = 0;

		for ( let i = 0; i < 3; i ++ ) {

			const t = e[ this.getElementIndex( colVal[ i ], rowVal[ i ] ) ];
			norm += 2 * t * t; // multiply the result by two since the matrix is symetric

		}

		return Math.sqrt( norm );

	}

	/**
	* Computes the eigenvectors and eigenvalues.
	*
	* Reference: https://github.com/AnalyticalGraphicsInc/cesium/blob/411a1afbd36b72df64d7362de6aa934730447234/Source/Core/Matrix3.js#L1141 (Apache License 2.0)
	*
	* The values along the diagonal of the diagonal matrix are the eigenvalues.
	* The columns of the unitary matrix are the corresponding eigenvectors.
	*
	* @param {Object} result - An object with unitary and diagonal properties which are matrices onto which to store the result.
	* @return {Object} An object with unitary and diagonal properties which are matrices onto which to store the result.
	*/
	eigenDecomposition( result ) {

		let count = 0;
		let sweep = 0;

		const maxSweeps = 10;

		result.unitary.identity();
		result.diagonal.copy( this );

		const unitaryMatrix = result.unitary;
		const diagonalMatrix = result.diagonal;

		const epsilon = Number.EPSILON * diagonalMatrix.frobeniusNorm();

		while ( sweep < maxSweeps && diagonalMatrix.offDiagonalFrobeniusNorm() > epsilon ) {

			diagonalMatrix.shurDecomposition( m1 );
			m2.copy( m1 ).transpose();
			diagonalMatrix.multiply( m1 );
			diagonalMatrix.premultiply( m2 );
			unitaryMatrix.multiply( m1 );

			if ( ++ count > 2 ) {

				sweep ++;
				count = 0;

			}

		}

		return result;

	}

	/**
	* Finds the largest off-diagonal term and then creates a matrix
	* which can be used to help reduce it.
	*
	* @param {Matrix3} result - The result matrix.
	* @return {Matrix3} The result matrix.
	*/
	shurDecomposition( result ) {

		let maxDiagonal = 0;
		let rotAxis = 1;

		// find pivot (rotAxis) based on largest off-diagonal term

		const e = this.elements;

		for ( let i = 0; i < 3; i ++ ) {

			const t = Math.abs( e[ this.getElementIndex( colVal[ i ], rowVal[ i ] ) ] );

			if ( t > maxDiagonal ) {

				maxDiagonal = t;
				rotAxis = i;

			}

		}

		let c = 1;
		let s = 0;

		const p = rowVal[ rotAxis ];
		const q = colVal[ rotAxis ];

		if ( Math.abs( e[ this.getElementIndex( q, p ) ] ) > Number.EPSILON ) {

			const qq = e[ this.getElementIndex( q, q ) ];
			const pp = e[ this.getElementIndex( p, p ) ];
			const qp = e[ this.getElementIndex( q, p ) ];

			const tau = ( qq - pp ) / 2 / qp;

			let t;

			if ( tau < 0 ) {

				t = - 1 / ( - tau + Math.sqrt( 1 + tau * tau ) );

			} else {

				t = 1 / ( tau + Math.sqrt( 1.0 + tau * tau ) );

			}

			c = 1.0 / Math.sqrt( 1.0 + t * t );
			s = t * c;

		}

		result.identity();

		result.elements[ this.getElementIndex( p, p ) ] = c;
		result.elements[ this.getElementIndex( q, q ) ] = c;
		result.elements[ this.getElementIndex( q, p ) ] = s;
		result.elements[ this.getElementIndex( p, q ) ] = - s;

		return result;

	}

	/**
	* Creates a rotation matrix from the given quaternion.
	*
	* @param {Quaternion} q - A quaternion representing a rotation.
	* @return {Matrix3} A reference to this matrix.
	*/
	fromQuaternion( q ) {

		const e = this.elements;

		const x = q.x, y = q.y, z = q.z, w = q.w;
		const x2 = x + x, y2 = y + y, z2 = z + z;
		const xx = x * x2, xy = x * y2, xz = x * z2;
		const yy = y * y2, yz = y * z2, zz = z * z2;
		const wx = w * x2, wy = w * y2, wz = w * z2;

		e[ 0 ] = 1 - ( yy + zz );
		e[ 3 ] = xy - wz;
		e[ 6 ] = xz + wy;

		e[ 1 ] = xy + wz;
		e[ 4 ] = 1 - ( xx + zz );
		e[ 7 ] = yz - wx;

		e[ 2 ] = xz - wy;
		e[ 5 ] = yz + wx;
		e[ 8 ] = 1 - ( xx + yy );

		return this;

	}

	/**
	* Sets the elements of this matrix by extracting the upper-left 3x3 portion
	* from a 4x4 matrix.
	*
	* @param {Matrix4} m - A 4x4 matrix.
	* @return {Matrix3} A reference to this matrix.
	*/
	fromMatrix4( m ) {

		const e = this.elements;
		const me = m.elements;

		e[ 0 ] = me[ 0 ]; e[ 1 ] = me[ 1 ]; e[ 2 ] = me[ 2 ];
		e[ 3 ] = me[ 4 ]; e[ 4 ] = me[ 5 ]; e[ 5 ] = me[ 6 ];
		e[ 6 ] = me[ 8 ]; e[ 7 ] = me[ 9 ]; e[ 8 ] = me[ 10 ];

		return this;

	}

	/**
	* Sets the elements of this matrix from an array.
	*
	* @param {Array} array - An array.
	* @param {Number} offset - An optional offset.
	* @return {Matrix3} A reference to this matrix.
	*/
	fromArray( array, offset = 0 ) {

		const e = this.elements;

		for ( let i = 0; i < 9; i ++ ) {

			e[ i ] = array[ i + offset ];

		}

		return this;

	}

	/**
	* Copies all elements of this matrix to the given array.
	*
	* @param {Array} array - An array.
	* @param {Number} offset - An optional offset.
	* @return {Array} The array with the elements of the matrix.
	*/
	toArray( array, offset = 0 ) {

		const e = this.elements;

		array[ offset + 0 ] = e[ 0 ];
		array[ offset + 1 ] = e[ 1 ];
		array[ offset + 2 ] = e[ 2 ];

		array[ offset + 3 ] = e[ 3 ];
		array[ offset + 4 ] = e[ 4 ];
		array[ offset + 5 ] = e[ 5 ];

		array[ offset + 6 ] = e[ 6 ];
		array[ offset + 7 ] = e[ 7 ];
		array[ offset + 8 ] = e[ 8 ];

		return array;

	}

	/**
	* Returns true if the given matrix is deep equal with this matrix.
	*
	* @param {Matrix3} m - The matrix to test.
	* @return {Boolean} The result of the equality test.
	*/
	equals( m ) {

		const e = this.elements;
		const me = m.elements;

		for ( let i = 0; i < 9; i ++ ) {

			if ( e[ i ] !== me[ i ] ) return false;

		}

		return true;

	}

}

const m1 = new Matrix3();
const m2 = new Matrix3();

const matrix = new Matrix3();
const vector = new Vector3();

/**
* Class representing a quaternion.
*
* @author {@link https://github.com/Mugen87|Mugen87}
*/
class Quaternion {

	/**
	* Constructs a new quaternion with the given values.
	*
	* @param {Number} x - The x component.
	* @param {Number} y - The y component.
	* @param {Number} z - The z component.
	* @param {Number} w - The w component.
	*/
	constructor( x = 0, y = 0, z = 0, w = 1 ) {

		/**
		* The x component.
		* @type Number
		*/
		this.x = x;

		/**
		* The y component.
		* @type Number
		*/
		this.y = y;

		/**
		* The z component.
		* @type Number
		*/
		this.z = z;

		/**
		* The w component.
		* @type Number
		*/
		this.w = w;

	}

	/**
	* Sets the given values to this quaternion.
	*
	* @param {Number} x - The x component.
	* @param {Number} y - The y component.
	* @param {Number} z - The z component.
	* @param {Number} w - The w component.
	* @return {Quaternion} A reference to this quaternion.
	*/
	set( x, y, z, w ) {

		this.x = x;
		this.y = y;
		this.z = z;
		this.w = w;

		return this;

	}

	/**
	* Copies all values from the given quaternion to this quaternion.
	*
	* @param {Quaternion} q - The quaternion to copy.
	* @return {Quaternion} A reference to this quaternion.
	*/
	copy( q ) {

		this.x = q.x;
		this.y = q.y;
		this.z = q.z;
		this.w = q.w;

		return this;

	}

	/**
	* Creates a new quaternion and copies all values from this quaternion.
	*
	* @return {Quaternion} A new quaternion.
	*/
	clone() {

		return new this.constructor().copy( this );

	}

	/**
	* Computes the inverse of this quaternion.
	*
	* @return {Quaternion} A reference to this quaternion.
	*/
	inverse() {

		return this.conjugate().normalize();

	}

	/**
	* Computes the conjugate of this quaternion.
	*
	* @return {Quaternion} A reference to this quaternion.
	*/
	conjugate() {

		this.x *= - 1;
		this.y *= - 1;
		this.z *= - 1;

		return this;

	}

	/**
	* Computes the dot product of this and the given quaternion.
	*
	* @param {Quaternion} q - The given quaternion.
	* @return {Quaternion} A reference to this quaternion.
	*/
	dot( q ) {

		return ( this.x * q.x ) + ( this.y * q.y ) + ( this.z * q.z ) + ( this.w * q.w );

	}

	/**
	* Computes the length of this quaternion.
	*
	* @return {Number} The length of this quaternion.
	*/
	length() {

		return Math.sqrt( this.squaredLength() );

	}

	/**
	* Computes the squared length of this quaternion.
	*
	* @return {Number} The squared length of this quaternion.
	*/
	squaredLength() {

		return this.dot( this );

	}

	/**
	* Normalizes this quaternion.
	*
	* @return {Quaternion} A reference to this quaternion.
	*/
	normalize() {

		let l = this.length();

		if ( l === 0 ) {

			this.x = 0;
			this.y = 0;
			this.z = 0;
			this.w = 1;

		} else {

			l = 1 / l;

			this.x = this.x * l;
			this.y = this.y * l;
			this.z = this.z * l;
			this.w = this.w * l;

		}

		return this;

	}

	/**
	* Multiplies this quaternion with the given quaternion.
	*
	* @param {Quaternion} q - The quaternion to multiply.
	* @return {Quaternion} A reference to this quaternion.
	*/
	multiply( q ) {

		return this.multiplyQuaternions( this, q );

	}

	/**
	* Multiplies the given quaternion with this quaternion.
	* So the order of the multiplication is switched compared to {@link Quaternion#multiply}.
	*
	* @param {Quaternion} q - The quaternion to multiply.
	* @return {Quaternion} A reference to this quaternion.
	*/
	premultiply( q ) {

		return this.multiplyQuaternions( q, this );

	}

	/**
	* Multiplies two given quaternions and stores the result in this quaternion.
	*
	* @param {Quaternion} a - The first quaternion of the operation.
	* @param {Quaternion} b - The second quaternion of the operation.
	* @return {Quaternion} A reference to this quaternion.
	*/
	multiplyQuaternions( a, b ) {

		const qax = a.x, qay = a.y, qaz = a.z, qaw = a.w;
		const qbx = b.x, qby = b.y, qbz = b.z, qbw = b.w;

		this.x = ( qax * qbw ) + ( qaw * qbx ) + ( qay * qbz ) - ( qaz * qby );
		this.y = ( qay * qbw ) + ( qaw * qby ) + ( qaz * qbx ) - ( qax * qbz );
		this.z = ( qaz * qbw ) + ( qaw * qbz ) + ( qax * qby ) - ( qay * qbx );
		this.w = ( qaw * qbw ) - ( qax * qbx ) - ( qay * qby ) - ( qaz * qbz );

		return this;

	}

	/**
	* Computes the shortest angle between two rotation defined by this quaternion and the given one.
	*
	* @param {Quaternion} q - The given quaternion.
	* @return {Number} The angle in radians.
	*/
	angleTo( q ) {

		return 2 * Math.acos( Math.abs( MathUtils.clamp( this.dot( q ), - 1, 1 ) ) );

	}

	/**
	* Transforms this rotation defined by this quaternion towards the target rotation
	* defined by the given quaternion by the given angular step. The rotation will not overshoot.
	*
	* @param {Quaternion} q - The target rotation.
	* @param {Number} step - The maximum step in radians.
	* @param {Number} tolerance - A tolerance value in radians to tweak the result
	* when both rotations are considered to be equal.
	* @return {Boolean} Whether the given quaternion already represents the target rotation.
	*/
	rotateTo( q, step, tolerance = 0.0001 ) {

		const angle = this.angleTo( q );

		if ( angle < tolerance ) return true;

		const t = Math.min( 1, step / angle );

		this.slerp( q, t );

		return false;

	}

	/**
	* Creates a quaternion that orients an object to face towards a specified target direction.
	*
	* @param {Vector3} localForward - Specifies the forward direction in the local space of the object.
	* @param {Vector3} targetDirection - Specifies the desired world space direction the object should look at.
	* @param {Vector3} localUp - Specifies the up direction in the local space of the object.
	* @return {Quaternion} A reference to this quaternion.
	*/
	lookAt( localForward, targetDirection, localUp ) {

		matrix.lookAt( localForward, targetDirection, localUp );
		this.fromMatrix3( matrix );

	}

	/**
	* Spherically interpolates between this quaternion and the given quaternion by t.
	* The parameter t is clamped to the range [0, 1].
	*
	* @param {Quaternion} q - The target rotation.
	* @param {Number} t - The interpolation parameter.
	* @return {Quaternion} A reference to this quaternion.
	*/
	slerp( q, t ) {

		if ( t === 0 ) return this;
		if ( t === 1 ) return this.copy( q );

		const x = this.x, y = this.y, z = this.z, w = this.w;

		let cosHalfTheta = w * q.w + x * q.x + y * q.y + z * q.z;

		if ( cosHalfTheta < 0 ) {

			this.w = - q.w;
			this.x = - q.x;
			this.y = - q.y;
			this.z = - q.z;

			cosHalfTheta = - cosHalfTheta;

		} else {

			this.copy( q );

		}

		if ( cosHalfTheta >= 1.0 ) {

			this.w = w;
			this.x = x;
			this.y = y;
			this.z = z;

			return this;

		}

		const sinHalfTheta = Math.sqrt( 1.0 - cosHalfTheta * cosHalfTheta );

		if ( Math.abs( sinHalfTheta ) < 0.001 ) {

			this.w = 0.5 * ( w + this.w );
			this.x = 0.5 * ( x + this.x );
			this.y = 0.5 * ( y + this.y );
			this.z = 0.5 * ( z + this.z );

			return this;

		}

		const halfTheta = Math.atan2( sinHalfTheta, cosHalfTheta );
		const ratioA = Math.sin( ( 1 - t ) * halfTheta ) / sinHalfTheta;
		const ratioB = Math.sin( t * halfTheta ) / sinHalfTheta;

		this.w = ( w * ratioA ) + ( this.w * ratioB );
		this.x = ( x * ratioA ) + ( this.x * ratioB );
		this.y = ( y * ratioA ) + ( this.y * ratioB );
		this.z = ( z * ratioA ) + ( this.z * ratioB );

		return this;

	}

	/**
	* Extracts the rotation of the given 4x4 matrix and stores it in this quaternion.
	*
	* @param {Matrix4} m - A 4x4 matrix.
	* @return {Quaternion} A reference to this quaternion.
	*/
	extractRotationFromMatrix( m ) {

		const e = matrix.elements;
		const me = m.elements;

		// remove scaling from the 3x3 portion

		const sx = 1 / vector.fromMatrix4Column( m, 0 ).length();
		const sy = 1 / vector.fromMatrix4Column( m, 1 ).length();
		const sz = 1 / vector.fromMatrix4Column( m, 2 ).length();

		e[ 0 ] = me[ 0 ] * sx;
		e[ 1 ] = me[ 1 ] * sx;
		e[ 2 ] = me[ 2 ] * sx;

		e[ 3 ] = me[ 4 ] * sy;
		e[ 4 ] = me[ 5 ] * sy;
		e[ 5 ] = me[ 6 ] * sy;

		e[ 6 ] = me[ 8 ] * sz;
		e[ 7 ] = me[ 9 ] * sz;
		e[ 8 ] = me[ 10 ] * sz;

		this.fromMatrix3( matrix );

		return this;

	}

	/**
	* Sets the components of this quaternion from the given euler angle (YXZ order).
	*
	* @param {Number} x - Rotation around x axis in radians.
	* @param {Number} y - Rotation around y axis in radians.
	* @param {Number} z - Rotation around z axis in radians.
	* @return {Quaternion} A reference to this quaternion.
	*/
	fromEuler( x, y, z ) {

		// from 3D Math Primer for Graphics and Game Development
		// 8.7.5 Converting Euler Angles to a Quaternion

		// assuming YXZ (head/pitch/bank or yaw/pitch/roll) order

		const c1 = Math.cos( y / 2 );
		const c2 = Math.cos( x / 2 );
		const c3 = Math.cos( z / 2 );

		const s1 = Math.sin( y / 2 );
		const s2 = Math.sin( x / 2 );
		const s3 = Math.sin( z / 2 );

		this.w = c1 * c2 * c3 + s1 * s2 * s3;
		this.x = c1 * s2 * c3 + s1 * c2 * s3;
		this.y = s1 * c2 * c3 - c1 * s2 * s3;
		this.z = c1 * c2 * s3 - s1 * s2 * c3;

		return this;

	}

	/**
	* Returns an euler angel (YXZ order) representation of this quaternion.
	*
	* @param {Object} euler - The resulting euler angles.
	* @return {Object} The resulting euler angles.
	*/
	toEuler( euler ) {

		// from 3D Math Primer for Graphics and Game Development
		// 8.7.6 Converting a Quaternion to Euler Angles

		// extract pitch

		const sp = - 2 * ( this.y * this.z - this.x * this.w );

		// check for gimbal lock

		if ( Math.abs( sp ) > 0.9999 ) {

			// looking straight up or down

			euler.x = Math.PI * 0.5 * sp;
			euler.y = Math.atan2( this.x * this.z + this.w * this.y, 0.5 - this.x * this.x - this.y * this.y );
			euler.z = 0;

		} else { //todo test

			euler.x = Math.asin( sp );
			euler.y = Math.atan2( this.x * this.z + this.w * this.y, 0.5 - this.x * this.x - this.y * this.y );
			euler.z = Math.atan2( this.x * this.y + this.w * this.z, 0.5 - this.x * this.x - this.z * this.z );

		}

		return euler;

	}

	/**
	* Sets the components of this quaternion from the given 3x3 rotation matrix.
	*
	* @param {Matrix3} m - The rotation matrix.
	* @return {Quaternion} A reference to this quaternion.
	*/
	fromMatrix3( m ) {

		const e = m.elements;

		const m11 = e[ 0 ], m12 = e[ 3 ], m13 = e[ 6 ];
		const m21 = e[ 1 ], m22 = e[ 4 ], m23 = e[ 7 ];
		const m31 = e[ 2 ], m32 = e[ 5 ], m33 = e[ 8 ];

		const trace = m11 + m22 + m33;

		if ( trace > 0 ) {

			let s = 0.5 / Math.sqrt( trace + 1.0 );

			this.w = 0.25 / s;
			this.x = ( m32 - m23 ) * s;
			this.y = ( m13 - m31 ) * s;
			this.z = ( m21 - m12 ) * s;

		} else if ( ( m11 > m22 ) && ( m11 > m33 ) ) {

			let s = 2.0 * Math.sqrt( 1.0 + m11 - m22 - m33 );

			this.w = ( m32 - m23 ) / s;
			this.x = 0.25 * s;
			this.y = ( m12 + m21 ) / s;
			this.z = ( m13 + m31 ) / s;

		} else if ( m22 > m33 ) {

			let s = 2.0 * Math.sqrt( 1.0 + m22 - m11 - m33 );

			this.w = ( m13 - m31 ) / s;
			this.x = ( m12 + m21 ) / s;
			this.y = 0.25 * s;
			this.z = ( m23 + m32 ) / s;

		} else {

			let s = 2.0 * Math.sqrt( 1.0 + m33 - m11 - m22 );

			this.w = ( m21 - m12 ) / s;
			this.x = ( m13 + m31 ) / s;
			this.y = ( m23 + m32 ) / s;
			this.z = 0.25 * s;

		}

		return this;

	}

	/**
	* Sets the components of this quaternion from an array.
	*
	* @param {Array} array - An array.
	* @param {Number} offset - An optional offset.
	* @return {Quaternion} A reference to this quaternion.
	*/
	fromArray( array, offset = 0 ) {

		this.x = array[ offset + 0 ];
		this.y = array[ offset + 1 ];
		this.z = array[ offset + 2 ];
		this.w = array[ offset + 3 ];

		return this;

	}

	/**
	* Copies all values of this quaternion to the given array.
	*
	* @param {Array} array - An array.
	* @param {Number} offset - An optional offset.
	* @return {Array} The array with the quaternion components.
	*/
	toArray( array, offset = 0 ) {

		array[ offset + 0 ] = this.x;
		array[ offset + 1 ] = this.y;
		array[ offset + 2 ] = this.z;
		array[ offset + 3 ] = this.w;

		return array;

	}

	/**
	* Returns true if the given quaternion is deep equal with this quaternion.
	*
	* @param {Quaternion} q - The quaternion to test.
	* @return {Boolean} The result of the equality test.
	*/
	equals( q ) {

		return ( ( q.x === this.x ) && ( q.y === this.y ) && ( q.z === this.z ) && ( q.w === this.w ) );

	}

}

/**
* Class representing a 4x4 matrix. The elements of the matrix
* are stored in column-major order.
*
* @author {@link https://github.com/Mugen87|Mugen87}
*/
class Matrix4 {

	/**
	* Constructs a new 4x4 identity matrix.
	*/
	constructor() {

		/**
		* The elements of the matrix in column-major order.
		* @type Array
		*/
		this.elements = [

			1, 0, 0, 0,
			0, 1, 0, 0,
			0, 0, 1, 0,
			0, 0, 0, 1

		];

	}

	/**
	* Sets the given values to this matrix. The arguments are in row-major order.
	*
	* @param {Number} n11 - An element of the matrix.
	* @param {Number} n12 - An element of the matrix.
	* @param {Number} n13 - An element of the matrix.
	* @param {Number} n14 - An element of the matrix.
	* @param {Number} n21 - An element of the matrix.
	* @param {Number} n22 - An element of the matrix.
	* @param {Number} n23 - An element of the matrix.
	* @param {Number} n24 - An element of the matrix.
	* @param {Number} n31 - An element of the matrix.
	* @param {Number} n32 - An element of the matrix.
	* @param {Number} n33 - An element of the matrix.
	* @param {Number} n34 - An element of the matrix.
	* @param {Number} n41 - An element of the matrix.
	* @param {Number} n42 - An element of the matrix.
	* @param {Number} n43 - An element of the matrix.
	* @param {Number} n44 - An element of the matrix.
	* @return {Matrix4} A reference to this matrix.
	*/
	set( n11, n12, n13, n14, n21, n22, n23, n24, n31, n32, n33, n34, n41, n42, n43, n44 ) {

		const e = this.elements;

		e[ 0 ] = n11; e[ 4 ] = n12; e[ 8 ] = n13; e[ 12 ] = n14;
		e[ 1 ] = n21; e[ 5 ] = n22; e[ 9 ] = n23; e[ 13 ] = n24;
		e[ 2 ] = n31; e[ 6 ] = n32; e[ 10 ] = n33; e[ 14 ] = n34;
		e[ 3 ] = n41; e[ 7 ] = n42; e[ 11 ] = n43; e[ 15 ] = n44;

		return this;

	}

	/**
	* Copies all values from the given matrix to this matrix.
	*
	* @param {Matrix4} m - The matrix to copy.
	* @return {Matrix4} A reference to this matrix.
	*/
	copy( m ) {

		const e = this.elements;
		const me = m.elements;

		e[ 0 ] = me[ 0 ]; e[ 1 ] = me[ 1 ]; e[ 2 ] = me[ 2 ]; e[ 3 ] = me[ 3 ];
		e[ 4 ] = me[ 4 ]; e[ 5 ] = me[ 5 ]; e[ 6 ] = me[ 6 ]; e[ 7 ] = me[ 7 ];
		e[ 8 ] = me[ 8 ]; e[ 9 ] = me[ 9 ]; e[ 10 ] = me[ 10 ]; e[ 11 ] = me[ 11 ];
		e[ 12 ] = me[ 12 ]; e[ 13 ] = me[ 13 ]; e[ 14 ] = me[ 14 ]; e[ 15 ] = me[ 15 ];

		return this;

	}

	/**
	* Creates a new matrix and copies all values from this matrix.
	*
	* @return {Matrix4} A new matrix.
	*/
	clone() {

		return new this.constructor().copy( this );

	}

	/**
	* Transforms this matrix to an identity matrix.
	*
	* @return {Matrix4} A reference to this matrix.
	*/
	identity() {

		this.set(

			1, 0, 0, 0,
			0, 1, 0, 0,
			0, 0, 1, 0,
			0, 0, 0, 1

		);

		return this;

	}

	/**
	* Multiplies this matrix with the given matrix.
	*
	* @param {Matrix4} m - The matrix to multiply.
	* @return {Matrix4} A reference to this matrix.
	*/
	multiply( m ) {

		return this.multiplyMatrices( this, m );

	}

	/**
	* Multiplies this matrix with the given matrix.
	* So the order of the multiplication is switched compared to {@link Matrix4#multiply}.
	*
	* @param {Matrix4} m - The matrix to multiply.
	* @return {Matrix4} A reference to this matrix.
	*/
	premultiply( m ) {

		return this.multiplyMatrices( m, this );

	}

	/**
	* Multiplies two given matrices and stores the result in this matrix.
	*
	* @param {Matrix4} a - The first matrix of the operation.
	* @param {Matrix4} b - The second matrix of the operation.
	* @return {Matrix4} A reference to this matrix.
	*/
	multiplyMatrices( a, b ) {

		const ae = a.elements;
		const be = b.elements;
		const e = this.elements;

		const a11 = ae[ 0 ], a12 = ae[ 4 ], a13 = ae[ 8 ], a14 = ae[ 12 ];
		const a21 = ae[ 1 ], a22 = ae[ 5 ], a23 = ae[ 9 ], a24 = ae[ 13 ];
		const a31 = ae[ 2 ], a32 = ae[ 6 ], a33 = ae[ 10 ], a34 = ae[ 14 ];
		const a41 = ae[ 3 ], a42 = ae[ 7 ], a43 = ae[ 11 ], a44 = ae[ 15 ];

		const b11 = be[ 0 ], b12 = be[ 4 ], b13 = be[ 8 ], b14 = be[ 12 ];
		const b21 = be[ 1 ], b22 = be[ 5 ], b23 = be[ 9 ], b24 = be[ 13 ];
		const b31 = be[ 2 ], b32 = be[ 6 ], b33 = be[ 10 ], b34 = be[ 14 ];
		const b41 = be[ 3 ], b42 = be[ 7 ], b43 = be[ 11 ], b44 = be[ 15 ];

		e[ 0 ] = ( a11 * b11 ) + ( a12 * b21 ) + ( a13 * b31 ) + ( a14 * b41 );
		e[ 4 ] = ( a11 * b12 ) + ( a12 * b22 ) + ( a13 * b32 ) + ( a14 * b42 );
		e[ 8 ] = ( a11 * b13 ) + ( a12 * b23 ) + ( a13 * b33 ) + ( a14 * b43 );
		e[ 12 ] = ( a11 * b14 ) + ( a12 * b24 ) + ( a13 * b34 ) + ( a14 * b44 );

		e[ 1 ] = ( a21 * b11 ) + ( a22 * b21 ) + ( a23 * b31 ) + ( a24 * b41 );
		e[ 5 ] = ( a21 * b12 ) + ( a22 * b22 ) + ( a23 * b32 ) + ( a24 * b42 );
		e[ 9 ] = ( a21 * b13 ) + ( a22 * b23 ) + ( a23 * b33 ) + ( a24 * b43 );
		e[ 13 ] = ( a21 * b14 ) + ( a22 * b24 ) + ( a23 * b34 ) + ( a24 * b44 );

		e[ 2 ] = ( a31 * b11 ) + ( a32 * b21 ) + ( a33 * b31 ) + ( a34 * b41 );
		e[ 6 ] = ( a31 * b12 ) + ( a32 * b22 ) + ( a33 * b32 ) + ( a34 * b42 );
		e[ 10 ] = ( a31 * b13 ) + ( a32 * b23 ) + ( a33 * b33 ) + ( a34 * b43 );
		e[ 14 ] = ( a31 * b14 ) + ( a32 * b24 ) + ( a33 * b34 ) + ( a34 * b44 );

		e[ 3 ] = ( a41 * b11 ) + ( a42 * b21 ) + ( a43 * b31 ) + ( a44 * b41 );
		e[ 7 ] = ( a41 * b12 ) + ( a42 * b22 ) + ( a43 * b32 ) + ( a44 * b42 );
		e[ 11 ] = ( a41 * b13 ) + ( a42 * b23 ) + ( a43 * b33 ) + ( a44 * b43 );
		e[ 15 ] = ( a41 * b14 ) + ( a42 * b24 ) + ( a43 * b34 ) + ( a44 * b44 );

		return this;

	}

	/**
	* Multiplies the given scalar with this matrix.
	*
	* @param {Number} s - The scalar to multiply.
	* @return {Matrix4} A reference to this matrix.
	*/
	multiplyScalar( s ) {

		const e = this.elements;

		e[ 0 ] *= s; e[ 4 ] *= s; e[ 8 ] *= s; e[ 12 ] *= s;
		e[ 1 ] *= s; e[ 5 ] *= s; e[ 9 ] *= s; e[ 13 ] *= s;
		e[ 2 ] *= s; e[ 6 ] *= s; e[ 10 ] *= s; e[ 14 ] *= s;
		e[ 3 ] *= s; e[ 7 ] *= s; e[ 11 ] *= s; e[ 15 ] *= s;

		return this;

	}

	/**
	* Extracts the basis vectors and stores them to the given vectors.
	*
	* @param {Vector3} xAxis - The first result vector for the x-axis.
	* @param {Vector3} yAxis - The second result vector for the y-axis.
	* @param {Vector3} zAxis - The third result vector for the z-axis.
	* @return {Matrix4} A reference to this matrix.
	*/
	extractBasis( xAxis, yAxis, zAxis ) {

		xAxis.fromMatrix4Column( this, 0 );
		yAxis.fromMatrix4Column( this, 1 );
		zAxis.fromMatrix4Column( this, 2 );

		return this;

	}

	/**
	* Makes a basis from the given vectors.
	*
	* @param {Vector3} xAxis - The first basis vector for the x-axis.
	* @param {Vector3} yAxis - The second basis vector for the y-axis.
	* @param {Vector3} zAxis - The third basis vector for the z-axis.
	* @return {Matrix4} A reference to this matrix.
	*/
	makeBasis( xAxis, yAxis, zAxis ) {

		this.set(
			xAxis.x, yAxis.x, zAxis.x, 0,
			xAxis.y, yAxis.y, zAxis.y, 0,
			xAxis.z, yAxis.z, zAxis.z, 0,
			0, 0, 0, 1
		);

		return this;

	}

	/**
	* Composes a matrix from the given position, quaternion and scale.
	*
	* @param {Vector3} position - A vector representing a position in 3D space.
	* @param {Quaternion} rotation - A quaternion representing a rotation.
	* @param {Vector3} scale - A vector representing a 3D scaling.
	* @return {Matrix4} A reference to this matrix.
	*/
	compose( position, rotation, scale ) {

		this.fromQuaternion( rotation );
		this.scale( scale );
		this.setPosition( position );

		return this;

	}

	/**
	* Scales this matrix by the given 3D vector.
	*
	* @param {Vector3} v - A 3D vector representing a scaling.
	* @return {Matrix4} A reference to this matrix.
	*/
	scale( v ) {

		const e = this.elements;

		const x = v.x, y = v.y, z = v.z;

		e[ 0 ] *= x; e[ 4 ] *= y; e[ 8 ] *= z;
		e[ 1 ] *= x; e[ 5 ] *= y; e[ 9 ] *= z;
		e[ 2 ] *= x; e[ 6 ] *= y; e[ 10 ] *= z;
		e[ 3 ] *= x; e[ 7 ] *= y; e[ 11 ] *= z;

		return this;

	}

	/**
	* Sets the translation part of the 4x4 matrix to the given position vector.
	*
	* @param {Vector3} v - A 3D vector representing a position.
	* @return {Matrix4} A reference to this matrix.
	*/
	setPosition( v ) {

		const e = this.elements;

		e[ 12 ] = v.x;
		e[ 13 ] = v.y;
		e[ 14 ] = v.z;

		return this;

	}

	/**
	* Transposes this matrix.
	*
	* @return {Matrix4} A reference to this matrix.
	*/
	transpose() {

		const e = this.elements;
		let t;

		t = e[ 1 ]; e[ 1 ] = e[ 4 ]; e[ 4 ] = t;
		t = e[ 2 ]; e[ 2 ] = e[ 8 ]; e[ 8 ] = t;
		t = e[ 6 ]; e[ 6 ] = e[ 9 ]; e[ 9 ] = t;

		t = e[ 3 ]; e[ 3 ] = e[ 12 ]; e[ 12 ] = t;
		t = e[ 7 ]; e[ 7 ] = e[ 13 ]; e[ 13 ] = t;
		t = e[ 11 ]; e[ 11 ] = e[ 14 ]; e[ 14 ] = t;

		return this;


	}

	/**
	* Computes the inverse of this matrix and stored the result in the given matrix.
	*
	* @param {Matrix4} m - The result matrix.
	* @return {Matrix4} The result matrix.
	*/
	getInverse( m ) {

		const e = this.elements;
		const me = m.elements;

		const n11 = e[ 0 ], n21 = e[ 1 ], n31 = e[ 2 ], n41 = e[ 3 ];
		const n12 = e[ 4 ], n22 = e[ 5 ], n32 = e[ 6 ], n42 = e[ 7 ];
		const n13 = e[ 8 ], n23 = e[ 9 ], n33 = e[ 10 ], n43 = e[ 11 ];
		const n14 = e[ 12 ], n24 = e[ 13 ], n34 = e[ 14 ], n44 = e[ 15 ];

		const t11 = n23 * n34 * n42 - n24 * n33 * n42 + n24 * n32 * n43 - n22 * n34 * n43 - n23 * n32 * n44 + n22 * n33 * n44;
		const t12 = n14 * n33 * n42 - n13 * n34 * n42 - n14 * n32 * n43 + n12 * n34 * n43 + n13 * n32 * n44 - n12 * n33 * n44;
		const t13 = n13 * n24 * n42 - n14 * n23 * n42 + n14 * n22 * n43 - n12 * n24 * n43 - n13 * n22 * n44 + n12 * n23 * n44;
		const t14 = n14 * n23 * n32 - n13 * n24 * n32 - n14 * n22 * n33 + n12 * n24 * n33 + n13 * n22 * n34 - n12 * n23 * n34;

		const det = n11 * t11 + n21 * t12 + n31 * t13 + n41 * t14;

		if ( det === 0 ) {

			Logger.warn( 'YUKA.Matrix4: .getInverse() can not invert matrix, determinant is 0.' );
			return this.identity();

		}

		const detInv = 1 / det;

		me[ 0 ] = t11 * detInv;
		me[ 1 ] = ( n24 * n33 * n41 - n23 * n34 * n41 - n24 * n31 * n43 + n21 * n34 * n43 + n23 * n31 * n44 - n21 * n33 * n44 ) * detInv;
		me[ 2 ] = ( n22 * n34 * n41 - n24 * n32 * n41 + n24 * n31 * n42 - n21 * n34 * n42 - n22 * n31 * n44 + n21 * n32 * n44 ) * detInv;
		me[ 3 ] = ( n23 * n32 * n41 - n22 * n33 * n41 - n23 * n31 * n42 + n21 * n33 * n42 + n22 * n31 * n43 - n21 * n32 * n43 ) * detInv;

		me[ 4 ] = t12 * detInv;
		me[ 5 ] = ( n13 * n34 * n41 - n14 * n33 * n41 + n14 * n31 * n43 - n11 * n34 * n43 - n13 * n31 * n44 + n11 * n33 * n44 ) * detInv;
		me[ 6 ] = ( n14 * n32 * n41 - n12 * n34 * n41 - n14 * n31 * n42 + n11 * n34 * n42 + n12 * n31 * n44 - n11 * n32 * n44 ) * detInv;
		me[ 7 ] = ( n12 * n33 * n41 - n13 * n32 * n41 + n13 * n31 * n42 - n11 * n33 * n42 - n12 * n31 * n43 + n11 * n32 * n43 ) * detInv;

		me[ 8 ] = t13 * detInv;
		me[ 9 ] = ( n14 * n23 * n41 - n13 * n24 * n41 - n14 * n21 * n43 + n11 * n24 * n43 + n13 * n21 * n44 - n11 * n23 * n44 ) * detInv;
		me[ 10 ] = ( n12 * n24 * n41 - n14 * n22 * n41 + n14 * n21 * n42 - n11 * n24 * n42 - n12 * n21 * n44 + n11 * n22 * n44 ) * detInv;
		me[ 11 ] = ( n13 * n22 * n41 - n12 * n23 * n41 - n13 * n21 * n42 + n11 * n23 * n42 + n12 * n21 * n43 - n11 * n22 * n43 ) * detInv;

		me[ 12 ] = t14 * detInv;
		me[ 13 ] = ( n13 * n24 * n31 - n14 * n23 * n31 + n14 * n21 * n33 - n11 * n24 * n33 - n13 * n21 * n34 + n11 * n23 * n34 ) * detInv;
		me[ 14 ] = ( n14 * n22 * n31 - n12 * n24 * n31 - n14 * n21 * n32 + n11 * n24 * n32 + n12 * n21 * n34 - n11 * n22 * n34 ) * detInv;
		me[ 15 ] = ( n12 * n23 * n31 - n13 * n22 * n31 + n13 * n21 * n32 - n11 * n23 * n32 - n12 * n21 * n33 + n11 * n22 * n33 ) * detInv;

		return m;

	}

	/**
	* Computes the maximum scale value for all three axis.
	*
	* @return {Number} The maximum scale value.
	*/
	getMaxScale() {

		const e = this.elements;

		const scaleXSq = e[ 0 ] * e[ 0 ] + e[ 1 ] * e[ 1 ] + e[ 2 ] * e[ 2 ];
		const scaleYSq = e[ 4 ] * e[ 4 ] + e[ 5 ] * e[ 5 ] + e[ 6 ] * e[ 6 ];
		const scaleZSq = e[ 8 ] * e[ 8 ] + e[ 9 ] * e[ 9 ] + e[ 10 ] * e[ 10 ];

		return Math.sqrt( Math.max( scaleXSq, scaleYSq, scaleZSq ) );

	}

	/**
	* Uses the given quaternion to transform the upper left 3x3 part to a rotation matrix.
	* Other parts of the matrix are equal to the identiy matrix.
	*
	* @param {Quaternion} q - A quaternion representing a rotation.
	* @return {Matrix4} A reference to this matrix.
	*/
	fromQuaternion( q ) {

		const e = this.elements;

		const x = q.x, y = q.y, z = q.z, w = q.w;
		const x2 = x + x, y2 = y + y, z2 = z + z;
		const xx = x * x2, xy = x * y2, xz = x * z2;
		const yy = y * y2, yz = y * z2, zz = z * z2;
		const wx = w * x2, wy = w * y2, wz = w * z2;

		e[ 0 ] = 1 - ( yy + zz );
		e[ 4 ] = xy - wz;
		e[ 8 ] = xz + wy;

		e[ 1 ] = xy + wz;
		e[ 5 ] = 1 - ( xx + zz );
		e[ 9 ] = yz - wx;

		e[ 2 ] = xz - wy;
		e[ 6 ] = yz + wx;
		e[ 10 ] = 1 - ( xx + yy );

		e[ 3 ] = 0;
		e[ 7 ] = 0;
		e[ 11 ] = 0;

		e[ 12 ] = 0;
		e[ 13 ] = 0;
		e[ 14 ] = 0;
		e[ 15 ] = 1;

		return this;

	}

	/**
	* Sets the upper-left 3x3 portion of this matrix by the given 3x3 matrix. Other
	* parts of the matrix are equal to the identiy matrix.
	*
	* @param {Matrix3} m - A 3x3 matrix.
	* @return {Matrix4} A reference to this matrix.
	*/
	fromMatrix3( m ) {

		const e = this.elements;
		const me = m.elements;

		e[ 0 ] = me[ 0 ];
		e[ 1 ] = me[ 1 ];
		e[ 2 ] = me[ 2 ];
		e[ 3 ] = 0;

		e[ 4 ] = me[ 3 ];
		e[ 5 ] = me[ 4 ];
		e[ 6 ] = me[ 5 ];
		e[ 7 ] = 0;

		e[ 8 ] = me[ 6 ];
		e[ 9 ] = me[ 7 ];
		e[ 10 ] = me[ 8 ];
		e[ 11 ] = 0;

		e[ 12 ] = 0;
		e[ 13 ] = 0;
		e[ 14 ] = 0;
		e[ 15 ] = 1;

		return this;

	}

	/**
	* Sets the elements of this matrix from an array.
	*
	* @param {Array} array - An array.
	* @param {Number} offset - An optional offset.
	* @return {Matrix4} A reference to this matrix.
	*/
	fromArray( array, offset = 0 ) {

		const e = this.elements;

		for ( let i = 0; i < 16; i ++ ) {

			e[ i ] = array[ i + offset ];

		}

		return this;

	}

	/**
	* Copies all elements of this matrix to the given array.
	*
	* @param {Array} array - An array.
	* @param {Number} offset - An optional offset.
	* @return {Array} The array with the elements of the matrix.
	*/
	toArray( array, offset = 0 ) {

		const e = this.elements;

		array[ offset + 0 ] = e[ 0 ];
		array[ offset + 1 ] = e[ 1 ];
		array[ offset + 2 ] = e[ 2 ];
		array[ offset + 3 ] = e[ 3 ];

		array[ offset + 4 ] = e[ 4 ];
		array[ offset + 5 ] = e[ 5 ];
		array[ offset + 6 ] = e[ 6 ];
		array[ offset + 7 ] = e[ 7 ];

		array[ offset + 8 ] = e[ 8 ];
		array[ offset + 9 ] = e[ 9 ];
		array[ offset + 10 ] = e[ 10 ];
		array[ offset + 11 ] = e[ 11 ];

		array[ offset + 12 ] = e[ 12 ];
		array[ offset + 13 ] = e[ 13 ];
		array[ offset + 14 ] = e[ 14 ];
		array[ offset + 15 ] = e[ 15 ];

		return array;

	}

	/**
	* Returns true if the given matrix is deep equal with this matrix.
	*
	* @param {Matrix4} m - The matrix to test.
	* @return {Boolean} The result of the equality test.
	*/
	equals( m ) {

		const e = this.elements;
		const me = m.elements;

		for ( let i = 0; i < 16; i ++ ) {

			if ( e[ i ] !== me[ i ] ) return false;

		}

		return true;

	}

}

const targetRotation = new Quaternion();
const targetDirection = new Vector3();
const quaternionWorld = new Quaternion();

/**
* Base class for all game entities.
*
* @author {@link https://github.com/Mugen87|Mugen87}
*/
class GameEntity {

	/**
	* Constructs a new game entity.
	*/
	constructor() {

		/**
		* The name of this game entity.
		* @type String
		*/
		this.name = '';

		/**
		* Whether this game entity is active or not.
		* @type Boolean
		* @default true
		*/
		this.active = true;

		/**
		* The child entities of this game entity.
		* @type Array
		*/
		this.children = new Array();

		/**
		* A reference to the parent entity of this game entity.
		* Automatically set when added to a {@link GameEntity}.
		* @type GameEntity
		* @default null
		*/
		this.parent = null;

		/**
		* A list of neighbors of this game entity.
		* @type Array
		*/
		this.neighbors = new Array();

		/**
		* Game entities within this radius are considered as neighbors of this entity.
		* @type Number
		* @default 1
		*/
		this.neighborhoodRadius = 1;

		/**
		* Whether the neighborhood of this game entity is updated or not.
		* @type Boolean
		* @default false
		*/
		this.updateNeighborhood = false;

		/**
		* The position of this game entity.
		* @type Vector3
		*/
		this.position = new Vector3();

		/**
		* The rotation of this game entity.
		* @type Quaternion
		*/
		this.rotation = new Quaternion();

		/**
		* The scaling of this game entity.
		* @type Vector3
		*/
		this.scale = new Vector3( 1, 1, 1 );

		/**
		* The default forward vector of this game entity.
		* @type Vector3
		* @default (0,0,1)
		*/
		this.forward = new Vector3( 0, 0, 1 );

		/**
		* The default up vector of this game entity.
		* @type Vector3
		* @default (0,1,0)
		*/
		this.up = new Vector3( 0, 1, 0 );

		/**
		* The bounding radius of this game entity in world units.
		* @type Number
		* @default 0
		*/
		this.boundingRadius = 0;

		/**
		* The maximum turn rate of this game entity in radians per seconds.
		* @type Number
		* @default π
		*/
		this.maxTurnRate = Math.PI;

		/**
		* Whether the entity can activate a trigger or not.
		* @type Boolean
		* @default true
		*/
		this.canAcitivateTrigger = true;

		/**
		* A transformation matrix representing the world space of this game entity.
		* @type Matrix4
		*/
		this.worldMatrix = new Matrix4();

		/**
		* A reference to the entity manager of this game entity.
		* Automatically set when added to an {@link EntityManager}.
		* @type EntityManager
		* @default null
		*/
		this.manager = null;

		// private properties

		// local transformation matrix. no part of the public API due to caching

		this._localMatrix = new Matrix4();

		// per-entity cache in order to avoid unnecessary matrix calculations

		this._cache = {
			position: new Vector3(),
			rotation: new Quaternion(),
			scale: new Vector3( 1, 1, 1 )
		};

		// render component

		this._renderComponent = null;
		this._renderComponentCallback = null;

		// flag to indicate whether the entity was updated by its manager at least once or not

		this._started = false;

		// unique ID, primarily used in context of serialization/deserialization

		this._uuid = null;

	}

	get uuid() {

		if ( this._uuid === null ) {

			this._uuid = MathUtils.generateUUID();

		}

		return this._uuid;

	}

	set uuid( uuid ) {

		this._uuid = uuid;

	}

	/**
	* Executed when this game entity is updated for the first time by its {@link EntityManager}.
	*
	* @return {GameEntity} A reference to this game entity.
	*/
	start() {}

	/**
	* Updates the internal state of this game entity. Normally called by {@link EntityManager#update}
	* in each simulation step.
	*
	* @param {Number} delta - The time delta.
	* @return {GameEntity} A reference to this game entity.
	*/
	update( /* delta */ ) {}


	/**
	* Adds a game entity as a child to this game entity.
	*
	* @param {GameEntity} entity - The game entity to add.
	* @return {GameEntity} A reference to this game entity.
	*/
	add( entity ) {

		if ( entity.parent !== null ) {

			entity.parent.remove( entity );

		}

		this.children.push( entity );
		entity.parent = this;

		return this;

	}

	/**
	* Removes a game entity as a child from this game entity.
	*
	* @param {GameEntity} entity - The game entity to remove.
	* @return {GameEntity} A reference to this game entity.
	*/
	remove( entity ) {

		const index = this.children.indexOf( entity );
		this.children.splice( index, 1 );

		entity.parent = null;

		return this;

	}

	/**
	* Computes the current direction (forward) vector of this game entity
	* and stores the result in the given vector.
	*
	* @param {Vector3} result - The direction vector of this game entity.
	* @return {Vector3} The direction vector of this game entity.
	*/
	getDirection( result ) {

		return result.copy( this.forward ).applyRotation( this.rotation ).normalize();

	}

	/**
	* Directly rotates the entity so it faces the given target position.
	*
	* @param {Vector3} target - The target position.
	* @return {GameEntity} A reference to this game entity.
	*/
	lookAt( target ) {

		targetDirection.subVectors( target, this.position ).normalize();

		this.rotation.lookAt( this.forward, targetDirection, this.up );

		return this;

	}

	/**
	* Given a target position, this method rotates the entity by an amount not
	* greater than {@link GameEntity#maxTurnRate} until it directly faces the target.
	*
	* @param {Vector3} target - The target position.
	* @param {Number} delta - The time delta.
	* @param {Number} tolerance - A tolerance value in radians to tweak the result
	* when a game entity is considered to face a target.
	* @return {Boolean} Whether the entity is faced to the target or not.
	*/
	rotateTo( target, delta, tolerance = 0.0001 ) {

		targetDirection.subVectors( target, this.position ).normalize();
		targetRotation.lookAt( this.forward, targetDirection, this.up );

		return this.rotation.rotateTo( targetRotation, this.maxTurnRate * delta, tolerance );

	}

	/**
	* Computes the current direction (forward) vector of this game entity
	* in world space and stores the result in the given vector.
	*
	* @param {Vector3} result - The direction vector of this game entity in world space.
	* @return {Vector3} The direction vector of this game entity in world space.
	*/
	getWorldDirection( result ) {

		quaternionWorld.extractRotationFromMatrix( this.worldMatrix );

		return result.copy( this.forward ).applyRotation( quaternionWorld ).normalize();

	}

	/**
	* Computes the current position of this game entity in world space and
	* stores the result in the given vector.
	*
	* @param {Vector3} result - The position of this game entity in world space.
	* @return {Vector3} The position of this game entity in world space.
	*/
	getWorldPosition( result ) {

		return result.extractPositionFromMatrix( this.worldMatrix );

	}

	/**
	* Updates the world matrix representing the world space.
	*
	* @param {Boolean} up - Whether to update the world matrices of the parents or not.
	* @param {Boolean} down - Whether to update the world matrices of the children or not.
	* @return {GameEntity} A reference to this game entity.
	*/
	updateWorldMatrix( up = false, down = false ) {

		const parent = this.parent;
		const children = this.children;

		// update higher levels first

		if ( up === true && parent !== null ) {

			parent.updateWorldMatrix( true );

		}

		// update this entity

		this._updateMatrix();

		if ( parent === null ) {

			this.worldMatrix.copy( this._localMatrix );

		} else {

			this.worldMatrix.multiplyMatrices( this.parent.worldMatrix, this._localMatrix );

		}

		// update lower levels

		if ( down === true ) {

			for ( let i = 0, l = children.length; i < l; i ++ ) {

				const child = children[ i ];

				child.updateWorldMatrix( false, true );

			}

		}

		return this;

	}

	/**
	* Sets a renderable component of a 3D engine with a sync callback for this game entity.
	*
	* @param {Object} renderComponent - A renderable component of a 3D engine.
	* @param {Function} callback - A callback that can be used to sync this game entity with the renderable component.
	* @return {GameEntity} A reference to this game entity.
	*/
	setRenderComponent( renderComponent, callback ) {

		this._renderComponent = renderComponent;
		this._renderComponentCallback = callback;

		return this;

	}

	/**
	* Holds the implementation for the message handling of this game entity.
	*
	* @param {Telegram} telegram - The telegram with the message data.
	* @return {Boolean} Whether the message was processed or not.
	*/
	handleMessage() {

		return false;

	}

	/**
	* Holds the implementation for the line of sight test of this game entity.
	* This method is used by {@link Vision#visible} in order to determine whether
	* this game entity blocks the given line of sight or not. Implement this method
	* when your game entity acts as an obstacle.
	*
	* @param {Ray} ray - The ray that represents the line of sight.
	* @param {Vector3} intersectionPoint - The intersection point.
	* @return {Vector3} The intersection point.
	*/
	lineOfSightTest() {

		return null;

	}

	/**
	* Sends a message with the given data to the specified receiver.
	*
	* @param {GameEntity} receiver - The receiver.
	* @param {String} message - The actual message.
	* @param {Number} delay - A time value in millisecond used to delay the message dispatching.
	* @param {Object} data - An object for custom data.
	* @return {GameEntity} A reference to this game entity.
	*/
	sendMessage( receiver, message, delay = 0, data = null ) {

		if ( this.manager !== null ) {

			this.manager.sendMessage( this, receiver, message, delay, data );

		} else {

			Logger.error( 'YUKA.GameEntity: The game entity must be added to a manager in order to send a message.' );

		}

		return this;

	}

	/**
	* Transforms this instance into a JSON object.
	*
	* @return {Object} The JSON object.
	*/
	toJSON() {

		return {
			type: this.constructor.name,
			uuid: this.uuid,
			name: this.name,
			active: this.active,
			children: entitiesToIds( this.children ),
			parent: ( this.parent !== null ) ? this.parent.uuid : null,
			neighbors: entitiesToIds( this.neighbors ),
			neighborhoodRadius: this.neighborhoodRadius,
			updateNeighborhood: this.updateNeighborhood,
			position: this.position.toArray( new Array() ),
			rotation: this.rotation.toArray( new Array() ),
			scale: this.scale.toArray( new Array() ),
			forward: this.forward.toArray( new Array() ),
			up: this.up.toArray( new Array() ),
			boundingRadius: this.boundingRadius,
			maxTurnRate: this.maxTurnRate,
			worldMatrix: this.worldMatrix.toArray( new Array() ),
			_localMatrix: this._localMatrix.toArray( new Array() ),
			_cache: {
				position: this._cache.position.toArray( new Array() ),
				rotation: this._cache.rotation.toArray( new Array() ),
				scale: this._cache.scale.toArray( new Array() ),
			},
			_started: this._started
		};

	}

	/**
	* Restores this instance from the given JSON object.
	*
	* @param {Object} json - The JSON object.
	* @return {GameEntity} A reference to this game entity.
	*/
	fromJSON( json ) {

		this.uuid = json.uuid;
		this.name = json.name;
		this.active = json.active;
		this.neighborhoodRadius = json.neighborhoodRadius;
		this.updateNeighborhood = json.updateNeighborhood;
		this.position.fromArray( json.position );
		this.rotation.fromArray( json.rotation );
		this.scale.fromArray( json.scale );
		this.forward.fromArray( json.forward );
		this.up.fromArray( json.up );
		this.boundingRadius = json.boundingRadius;
		this.maxTurnRate = json.maxTurnRate;
		this.worldMatrix.fromArray( json.worldMatrix );

		this.children = json.children.slice();
		this.neighbors = json.neighbors.slice();
		this.parent = json.parent;

		this._localMatrix.fromArray( json._localMatrix );

		this._cache.position.fromArray( json._cache.position );
		this._cache.rotation.fromArray( json._cache.rotation );
		this._cache.scale.fromArray( json._cache.scale );

		this._started = json._started;

		return this;

	}

	/**
	* Restores UUIDs with references to GameEntity objects.
	*
	* @param {Map} entities - Maps game entities to UUIDs.
	* @return {GameEntity} A reference to this game entity.
	*/
	resolveReferences( entities ) {

		//

		const neighbors = this.neighbors;

		for ( let i = 0, l = neighbors.length; i < l; i ++ ) {

			neighbors[ i ] = entities.get( neighbors[ i ] );

		}

		//

		const children = this.children;

		for ( let i = 0, l = children.length; i < l; i ++ ) {

			children[ i ] = entities.get( children[ i ] );

		}

		//

		this.parent = entities.get( this.parent ) || null;

		return this;

	}

	// Updates the transformation matrix representing the local space.

	_updateMatrix() {

		const cache = this._cache;

		if ( cache.position.equals( this.position ) &&
				cache.rotation.equals( this.rotation ) &&
				cache.scale.equals( this.scale ) ) {

			return this;

		}

		this._localMatrix.compose( this.position, this.rotation, this.scale );

		cache.position.copy( this.position );
		cache.rotation.copy( this.rotation );
		cache.scale.copy( this.scale );

		return this;

	}

}

function entitiesToIds( array ) {

	const ids = new Array();

	for ( let i = 0, l = array.length; i < l; i ++ ) {

		ids.push( array[ i ].uuid );

	}

	return ids;

}

const displacement = new Vector3();
const target = new Vector3();

/**
* Class representing moving game entities.
*
* @author {@link https://github.com/Mugen87|Mugen87}
* @augments GameEntity
*/
class MovingEntity extends GameEntity {

	/**
	* Constructs a new moving entity.
	*/
	constructor() {

		super();

		/**
		* The velocity of this game entity.
		* @type Vector3
		*/
		this.velocity = new Vector3();

		/**
		* The maximum speed at which this game entity may travel.
		* @type Number
		*/
		this.maxSpeed = 1;

		/**
		* Whether the orientation of this game entity will be updated based on the velocity or not.
		* @type Boolean
		* @default true
		*/
		this.updateOrientation = true;

	}

	/**
	* Updates the internal state of this game entity.
	*
	* @param {Number} delta - The time delta.
	* @return {MovingEntity} A reference to this moving entity.
	*/
	update( delta ) {

		// make sure vehicle does not exceed maximum speed

		if ( this.getSpeedSquared() > ( this.maxSpeed * this.maxSpeed ) ) {

			this.velocity.normalize();
			this.velocity.multiplyScalar( this.maxSpeed );

		}

		// calculate displacement

		displacement.copy( this.velocity ).multiplyScalar( delta );

		// calculate target position

		target.copy( this.position ).add( displacement );

		// update the orientation if the vehicle has a non zero velocity

		if ( this.updateOrientation && this.getSpeedSquared() > 0.00000001 ) {

			this.lookAt( target );

		}

		// update position

		this.position.copy( target );

		return this;

	}

	/**
	* Returns the current speed of this game entity.
	*
	* @return {Number} The current speed.
	*/
	getSpeed() {

		return this.velocity.length();

	}

	/**
	* Returns the current speed in squared space of this game entity.
	*
	* @return {Number} The current speed in squared space.
	*/
	getSpeedSquared() {

		return this.velocity.squaredLength();

	}

	/**
	* Transforms this instance into a JSON object.
	*
	* @return {Object} The JSON object.
	*/
	toJSON() {

		const json = super.toJSON();

		json.velocity = this.velocity.toArray( new Array() );
		json.maxSpeed = this.maxSpeed;
		json.updateOrientation = this.updateOrientation;

		return json;

	}

	/**
	* Restores this instance from the given JSON object.
	*
	* @param {Object} json - The JSON object.
	* @return {MovingEntity} A reference to this moving entity.
	*/
	fromJSON( json ) {

		super.fromJSON( json );

		this.velocity.fromArray( json.velocity );
		this.maxSpeed = json.maxSpeed;
		this.updateOrientation = json.updateOrientation;

		return this;

	}

}

/**
* Base class for all concrete steering behaviors. They produce a force that describes
* where an agent should move and how fast it should travel to get there.
*
* Note: All built-in steering behaviors assume a {@link Vehicle#mass} of one. Different values can lead to an unexpected results.
*
* @author {@link https://github.com/Mugen87|Mugen87}
*/
class SteeringBehavior {

	/**
	* Constructs a new steering behavior.
	*/
	constructor() {

		/**
		* Whether this steering behavior is active or not.
		* @type Boolean
		* @default true
		*/
		this.active = true;

		/**
		* Can be used to tweak the amount that a steering force contributes to the total steering force.
		* @type Number
		* @default 1
		*/
		this.weight = 1;

	}

	/**
	 * Override this handler to perform behaviour setup for vehicle upon addition of behaviour
	 * @param {*} vehicle
	 */
	onAdded(vehicle) {}

	/**
	 * Override this handler to perform behaviour cleanup for vehicle upon removal of behaviour
	 * @param {*} vehicle
	 */
	onRemoved(vehicle) {}

	/**
	* Calculates the steering force for a single simulation step.
	*
	* @param {Vehicle} vehicle - The game entity the force is produced for.
	* @param {Vector3} force - The force/result vector.
	* @param {Number} delta - The time delta.
	* @return {Vector3} The force/result vector.
	*/
	calculate( /* vehicle, force, delta */ ) {}

	/**
	* Transforms this instance into a JSON object.
	*
	* @return {Object} The JSON object.
	*/
	toJSON() {

		return {
			type: this.constructor.name,
			active: this.active,
			weight: this.weight
		};

	}

	/**
	* Restores this instance from the given JSON object.
	*
	* @param {Object} json - The JSON object.
	* @return {SteeringBehavior} A reference to this steering behavior.
	*/
	fromJSON( json ) {

		this.active = json.active;
		this.weight = json.weight;

		return this;

	}

	/**
	* Restores UUIDs with references to GameEntity objects.
	*
	* @param {Map} entities - Maps game entities to UUIDs.
	* @return {SteeringBehavior} A reference to this steering behavior.
	*/
	resolveReferences( /* entities */ ) {}

}

const averageDirection = new Vector3();
const direction = new Vector3();

/**
* This steering behavior produces a force that keeps a vehicle’s heading aligned with its neighbors.
*
* @author {@link https://github.com/Mugen87|Mugen87}
* @augments SteeringBehavior
*/
class AlignmentBehavior extends SteeringBehavior {

	/**
	* Constructs a new alignment behavior.
	*/
	constructor() {

		super();

	}

	/**
	* Calculates the steering force for a single simulation step.
	*
	* @param {Vehicle} vehicle - The game entity the force is produced for.
	* @param {Vector3} force - The force/result vector.
	* @param {Number} delta - The time delta.
	* @return {Vector3} The force/result vector.
	*/
	calculate( vehicle, force /*, delta */ ) {

		averageDirection.set( 0, 0, 0 );

		const neighbors = vehicle.neighbors;

		// iterate over all neighbors to calculate the average direction vector

		for ( let i = 0, l = neighbors.length; i < l; i ++ ) {

			const neighbor = neighbors[ i ];

			neighbor.getDirection( direction );

			averageDirection.add( direction );

		}

		if ( neighbors.length > 0 ) {

			averageDirection.divideScalar( neighbors.length );

			// produce a force to align the vehicle's heading

			vehicle.getDirection( direction );
			force.subVectors( averageDirection, direction );

		}

		return force;

	}

}

const desiredVelocity = new Vector3();
const displacement$1 = new Vector3();

/**
* This steering behavior produces a force that directs an agent toward a target position.
* Unlike {@link SeekBehavior}, it decelerates so the agent comes to a gentle halt at the target position.
*
* @author {@link https://github.com/Mugen87|Mugen87}
* @augments SteeringBehavior
*/
class ArriveBehavior extends SteeringBehavior {

	/**
	* Constructs a new arrive behavior.
	*
	* @param {Vector3} target - The target vector.
	* @param {Number} deceleration - The amount of deceleration.
	* @param {Number} tolerance - A tolerance value in world units to prevent the vehicle from overshooting its target.
	*/
	constructor( target = new Vector3(), deceleration = 3, tolerance = 0 ) {

		super();

		/**
		* The target vector.
		* @type Vector3
		*/
		this.target = target;

		/**
		* The amount of deceleration.
		* @type Number
		* @default 3
		*/
		this.deceleration = deceleration;

		/**
		 * A tolerance value in world units to prevent the vehicle from overshooting its target.
		 * @type {Number}
		 * @default 0
		 */
		this.tolerance = tolerance;

	}

	/**
	* Calculates the steering force for a single simulation step.
	*
	* @param {Vehicle} vehicle - The game entity the force is produced for.
	* @param {Vector3} force - The force/result vector.
	* @param {Number} delta - The time delta.
	* @return {Vector3} The force/result vector.
	*/
	calculate( vehicle, force /*, delta */ ) {

		const target = this.target;
		const deceleration = this.deceleration;

		displacement$1.subVectors( target, vehicle.position );

		const distance = displacement$1.length();

		if ( distance > this.tolerance ) {

			// calculate the speed required to reach the target given the desired deceleration

			let speed = distance / deceleration;

			// make sure the speed does not exceed the max

			speed = Math.min( speed, vehicle.maxSpeed );

			// from here proceed just like "seek" except we don't need to normalize
			// the "displacement" vector because we have already gone to the trouble
			// of calculating its length.

			desiredVelocity.copy( displacement$1 ).multiplyScalar( speed / distance );

		} else {

			desiredVelocity.set( 0, 0, 0 );

		}

		return force.subVectors( desiredVelocity, vehicle.velocity );

	}

	/**
	* Transforms this instance into a JSON object.
	*
	* @return {Object} The JSON object.
	*/
	toJSON() {

		const json = super.toJSON();

		json.target = this.target.toArray( new Array() );
		json.deceleration = this.deceleration;

		return json;

	}

	/**
	* Restores this instance from the given JSON object.
	*
	* @param {Object} json - The JSON object.
	* @return {ArriveBehavior} A reference to this behavior.
	*/
	fromJSON( json ) {

		super.fromJSON( json );

		this.target.fromArray( json.target );
		this.deceleration = json.deceleration;

		return this;

	}

}

const desiredVelocity$1 = new Vector3();

/**
* This steering behavior produces a force that directs an agent toward a target position.
*
* @author {@link https://github.com/Mugen87|Mugen87}
* @augments SteeringBehavior
*/
class SeekBehavior extends SteeringBehavior {

	/**
	* Constructs a new seek behavior.
	*
	* @param {Vector3} target - The target vector.
	*/
	constructor( target = new Vector3() ) {

		super();

		/**
		* The target vector.
		* @type Vector3
		*/
		this.target = target;

	}

	/**
	* Calculates the steering force for a single simulation step.
	*
	* @param {Vehicle} vehicle - The game entity the force is produced for.
	* @param {Vector3} force - The force/result vector.
	* @param {Number} delta - The time delta.
	* @return {Vector3} The force/result vector.
	*/
	calculate( vehicle, force /*, delta */ ) {

		const target = this.target;

		// First the desired velocity is calculated.
		// This is the velocity the agent would need to reach the target position in an ideal world.
		// It represents the vector from the agent to the target,
		// scaled to be the length of the maximum possible speed of the agent.

		desiredVelocity$1.subVectors( target, vehicle.position ).normalize();
		desiredVelocity$1.multiplyScalar( vehicle.maxSpeed );

		// The steering force returned by this method is the force required,
		// which when added to the agent’s current velocity vector gives the desired velocity.
		// To achieve this you simply subtract the agent’s current velocity from the desired velocity.

		return force.subVectors( desiredVelocity$1, vehicle.velocity );

	}

	/**
	* Transforms this instance into a JSON object.
	*
	* @return {Object} The JSON object.
	*/
	toJSON() {

		const json = super.toJSON();

		json.target = this.target.toArray( new Array() );

		return json;

	}

	/**
	* Restores this instance from the given JSON object.
	*
	* @param {Object} json - The JSON object.
	* @return {SeekBehavior} A reference to this behavior.
	*/
	fromJSON( json ) {

		super.fromJSON( json );

		this.target.fromArray( json.target );

		return this;

	}

}

const centerOfMass = new Vector3();

/**
* This steering produces a steering force that moves a vehicle toward the center of mass of its neighbors.
*
* @author {@link https://github.com/Mugen87|Mugen87}
* @augments SteeringBehavior
*/
class CohesionBehavior extends SteeringBehavior {

	/**
	* Constructs a new cohesion behavior.
	*/
	constructor() {

		super();

		// internal behaviors

		this._seek = new SeekBehavior();

	}

	/**
	* Calculates the steering force for a single simulation step.
	*
	* @param {Vehicle} vehicle - The game entity the force is produced for.
	* @param {Vector3} force - The force/result vector.
	* @param {Number} delta - The time delta.
	* @return {Vector3} The force/result vector.
	*/
	calculate( vehicle, force /*, delta */ ) {

		centerOfMass.set( 0, 0, 0 );

		const neighbors = vehicle.neighbors;

		// iterate over all neighbors to calculate the center of mass

		for ( let i = 0, l = neighbors.length; i < l; i ++ ) {

			const neighbor = neighbors[ i ];

			centerOfMass.add( neighbor.position );

		}

		if ( neighbors.length > 0 ) {

			centerOfMass.divideScalar( neighbors.length );

			// seek to it

			this._seek.target = centerOfMass;
			this._seek.calculate( vehicle, force );

			// the magnitude of cohesion is usually much larger than separation
			// or alignment so it usually helps to normalize it

			force.normalize();

		}

		return force;

	}

}

const desiredVelocity$2 = new Vector3();

/**
* This steering behavior produces a force that steers an agent away from a target position.
* It's the opposite of {@link SeekBehavior}.
*
* @author {@link https://github.com/Mugen87|Mugen87}
* @augments SteeringBehavior
*/
class FleeBehavior extends SteeringBehavior {

	/**
	* Constructs a new flee behavior.
	*
	* @param {Vector3} target - The target vector.
	* @param {Number} panicDistance - The agent only flees from the target if it is inside this radius.
	*/
	constructor( target = new Vector3(), panicDistance = 10 ) {

		super();

		/**
		* The target vector.
		* @type Vector3
		*/
		this.target = target;

		/**
		* The agent only flees from the target if it is inside this radius.
		* @type Number
		* @default 10
		*/
		this.panicDistance = panicDistance;

	}

	/**
	* Calculates the steering force for a single simulation step.
	*
	* @param {Vehicle} vehicle - The game entity the force is produced for.
	* @param {Vector3} force - The force/result vector.
	* @param {Number} delta - The time delta.
	* @return {Vector3} The force/result vector.
	*/
	calculate( vehicle, force /*, delta */ ) {

		const target = this.target;

		// only flee if the target is within panic distance

		const distanceToTargetSq = vehicle.position.squaredDistanceTo( target );

		if ( distanceToTargetSq <= ( this.panicDistance * this.panicDistance ) ) {

			// from here, the only difference compared to seek is that the desired
			// velocity is calculated using a vector pointing in the opposite direction

			desiredVelocity$2.subVectors( vehicle.position, target ).normalize();

			// if target and vehicle position are identical, choose default velocity

			if ( desiredVelocity$2.squaredLength() === 0 ) {

				desiredVelocity$2.set( 0, 0, 1 );

			}

			desiredVelocity$2.multiplyScalar( vehicle.maxSpeed );

			force.subVectors( desiredVelocity$2, vehicle.velocity );

		}

		return force;

	}

	/**
	* Transforms this instance into a JSON object.
	*
	* @return {Object} The JSON object.
	*/
	toJSON() {

		const json = super.toJSON();

		json.target = this.target.toArray( new Array() );
		json.panicDistance = this.panicDistance;

		return json;

	}

	/**
	* Restores this instance from the given JSON object.
	*
	* @param {Object} json - The JSON object.
	* @return {FleeBehavior} A reference to this behavior.
	*/
	fromJSON( json ) {

		super.fromJSON( json );

		this.target.fromArray( json.target );
		this.panicDistance = json.panicDistance;

		return this;

	}

}

const displacement$2 = new Vector3();
const newPursuerVelocity = new Vector3();
const predictedPosition = new Vector3();

/**
* This steering behavior is is almost the same as {@link PursuitBehavior} except that
* the agent flees from the estimated future position of the pursuer.
*
* @author {@link https://github.com/Mugen87|Mugen87}
* @augments SteeringBehavior
*/
class EvadeBehavior extends SteeringBehavior {

	/**
	* Constructs a new evade behavior.
	*
	* @param {MovingEntity} pursuer - The agent to evade from.
	* @param {Number} panicDistance - The agent only flees from the pursuer if it is inside this radius.
	* @param {Number} predictionFactor - This factor determines how far the vehicle predicts the movement of the pursuer.
	*/
	constructor( pursuer = null, panicDistance = 10, predictionFactor = 1 ) {

		super();

		/**
		* The agent to evade from.
		* @type MovingEntity
		* @default null
		*/
		this.pursuer = pursuer;

		/**
		* The agent only flees from the pursuer if it is inside this radius.
		* @type Number
		* @default 10
		*/
		this.panicDistance = panicDistance;

		/**
		* This factor determines how far the vehicle predicts the movement of the pursuer.
		* @type Number
		* @default 1
		*/
		this.predictionFactor = predictionFactor;

		// internal behaviors

		this._flee = new FleeBehavior();

	}

	/**
	* Calculates the steering force for a single simulation step.
	*
	* @param {Vehicle} vehicle - The game entity the force is produced for.
	* @param {Vector3} force - The force/result vector.
	* @param {Number} delta - The time delta.
	* @return {Vector3} The force/result vector.
	*/
	calculate( vehicle, force /*, delta */ ) {

		const pursuer = this.pursuer;

		displacement$2.subVectors( pursuer.position, vehicle.position );

		let lookAheadTime = displacement$2.length() / ( vehicle.maxSpeed + pursuer.getSpeed() );
		lookAheadTime *= this.predictionFactor; // tweak the magnitude of the prediction

		// calculate new velocity and predicted future position

		newPursuerVelocity.copy( pursuer.velocity ).multiplyScalar( lookAheadTime );
		predictedPosition.addVectors( pursuer.position, newPursuerVelocity );

		// now flee away from predicted future position of the pursuer

		this._flee.target = predictedPosition;
		this._flee.panicDistance = this.panicDistance;
		this._flee.calculate( vehicle, force );

		return force;

	}

	/**
	* Transforms this instance into a JSON object.
	*
	* @return {Object} The JSON object.
	*/
	toJSON() {

		const json = super.toJSON();

		json.pursuer = this.pursuer ? this.pursuer.uuid : null;
		json.panicDistance = this.panicDistance;
		json.predictionFactor = this.predictionFactor;

		return json;

	}

	/**
	* Restores this instance from the given JSON object.
	*
	* @param {Object} json - The JSON object.
	* @return {EvadeBehavior} A reference to this behavior.
	*/
	fromJSON( json ) {

		super.fromJSON( json );

		this.pursuer = json.pursuer;
		this.panicDistance = json.panicDistance;
		this.predictionFactor = json.predictionFactor;

		return this;

	}

	/**
	* Restores UUIDs with references to GameEntity objects.
	*
	* @param {Map} entities - Maps game entities to UUIDs.
	* @return {EvadeBehavior} A reference to this behavior.
	*/
	resolveReferences( entities ) {

		this.pursuer = entities.get( this.pursuer ) || null;

	}

}

/**
* Class for representing a walkable path.
*
* @author {@link https://github.com/Mugen87|Mugen87}
*/
class Path {

	/**
	* Constructs a new path.
	*/
	constructor() {

		/**
		* Whether this path is looped or not.
		* @type Boolean
		*/
		this.loop = false;

		this._waypoints = new Array();
		this._index = 0;

	}

	/**
	* Adds the given waypoint to this path.
	*
	* @param {Vector3} waypoint - The waypoint to add.
	* @return {Path} A reference to this path.
	*/
	add( waypoint ) {

		this._waypoints.push( waypoint );

		return this;

	}

	/**
	* Clears the internal state of this path.
	*
	* @return {Path} A reference to this path.
	*/
	clear() {

		this._waypoints.length = 0;
		this._index = 0;

		return this;

	}

	/**
	* Returns the current active waypoint of this path.
	*
	* @return {Vector3} The current active waypoint.
	*/
	current() {

		return this._waypoints[ this._index ];

	}

	/**
	* Returns true if this path is not looped and the last waypoint is active.
	*
	* @return {Boolean} Whether this path is finished or not.
	*/
	finished() {

		const lastIndex = this._waypoints.length - 1;

		return ( this.loop === true ) ? false : ( this._index === lastIndex );

	}

	/**
	* Makes the next waypoint of this path active. If the path is looped and
	* {@link Path#finished} returns true, the path starts from the beginning.
	*
	* @return {Path} A reference to this path.
	*/
	advance() {

		this._index ++;

		if ( ( this._index === this._waypoints.length ) ) {

			if ( this.loop === true ) {

				this._index = 0;

			} else {

				this._index --;

			}

		}

		return this;

	}

	/**
	* Transforms this instance into a JSON object.
	*
	* @return {Object} The JSON object.
	*/
	toJSON() {

		const data = {
			type: this.constructor.name,
			loop: this.loop,
			_waypoints: new Array(),
			_index: this._index
		};

		// waypoints

		const waypoints = this._waypoints;

		for ( let i = 0, l = waypoints.length; i < l; i ++ ) {

			const waypoint = waypoints[ i ];
			data._waypoints.push( waypoint.toArray( new Array() ) );

		}

		return data;

	}

	/**
	* Restores this instance from the given JSON object.
	*
	* @param {Object} json - The JSON object.
	* @return {Path} A reference to this path.
	*/
	fromJSON( json ) {

		this.loop = json.loop;
		this._index = json._index;

		// waypoints

		const waypointsJSON = json._waypoints;

		for ( let i = 0, l = waypointsJSON.length; i < l; i ++ ) {

			const waypointJSON = waypointsJSON[ i ];
			this._waypoints.push( new Vector3().fromArray( waypointJSON ) );

		}

		return this;

	}

}

/**
* This steering behavior produces a force that moves a vehicle along a series of waypoints forming a path.
*
* @author {@link https://github.com/Mugen87|Mugen87}
* @augments SteeringBehavior
*/
class FollowPathBehavior extends SteeringBehavior {

	/**
	* Constructs a new follow path behavior.
	*
	* @param {Path} path - The path to follow.
	* @param {Number} nextWaypointDistance - The distance the agent seeks for the next waypoint.
	*/
	constructor( path = new Path(), nextWaypointDistance = 1 ) {

		super();

		/**
		* The path to follow.
		* @type Path
		*/
		this.path = path;

		/**
		* The distance the agent seeks for the next waypoint.
		* @type Number
		* @default 1
		*/
		this.nextWaypointDistance = nextWaypointDistance;

		// internal behaviors

		this._arrive = new ArriveBehavior();
		this._seek = new SeekBehavior();

	}

	/**
	* Calculates the steering force for a single simulation step.
	*
	* @param {Vehicle} vehicle - The game entity the force is produced for.
	* @param {Vector3} force - The force/result vector.
	* @param {Number} delta - The time delta.
	* @return {Vector3} The force/result vector.
	*/
	calculate( vehicle, force /*, delta */ ) {

		const path = this.path;

		// calculate distance in square space from current waypoint to vehicle

		const distanceSq = path.current().squaredDistanceTo( vehicle.position );

		// move to next waypoint if close enough to current target

		if ( distanceSq < ( this.nextWaypointDistance * this.nextWaypointDistance ) ) {

			path.advance();

		}

		const target = path.current();

		if ( path.finished() === true ) {

			this._arrive.target = target;
			this._arrive.calculate( vehicle, force );

		} else {

			this._seek.target = target;
			this._seek.calculate( vehicle, force );

		}

		return force;

	}

	/**
	* Transforms this instance into a JSON object.
	*
	* @return {Object} The JSON object.
	*/
	toJSON() {

		const json = super.toJSON();

		json.path = this.path.toJSON();
		json.nextWaypointDistance = this.nextWaypointDistance;

		return json;

	}

	/**
	* Restores this instance from the given JSON object.
	*
	* @param {Object} json - The JSON object.
	* @return {FollowPathBehavior} A reference to this behavior.
	*/
	fromJSON( json ) {

		super.fromJSON( json );

		this.path.fromJSON( json.path );
		this.nextWaypointDistance = json.nextWaypointDistance;

		return this;

	}

}

const midPoint = new Vector3();
const translation = new Vector3();
const predictedPosition1 = new Vector3();
const predictedPosition2 = new Vector3();

/**
* This steering behavior produces a force that moves a vehicle to the midpoint
* of the imaginary line connecting two other agents.
*
* @author {@link https://github.com/Mugen87|Mugen87}
* @augments SteeringBehavior
*/
class InterposeBehavior extends SteeringBehavior {

	/**
	* Constructs a new interpose behavior.
	*
	* @param {MovingEntity} entity1 - The first agent.
	* @param {MovingEntity} entity2 - The second agent.
	* @param {Number} deceleration - The amount of deceleration.
	*/
	constructor( entity1 = null, entity2 = null, deceleration = 3 ) {

		super();

		/**
		* The first agent.
		* @type MovingEntity
		* @default null
		*/
		this.entity1 = entity1;

		/**
		* The second agent.
		* @type MovingEntity
		* @default null
		*/
		this.entity2 = entity2;

		/**
		* The amount of deceleration.
		* @type Number
		* @default 3
		*/
		this.deceleration = deceleration;

		// internal behaviors

		this._arrive = new ArriveBehavior();

	}

	/**
	* Calculates the steering force for a single simulation step.
	*
	* @param {Vehicle} vehicle - The game entity the force is produced for.
	* @param {Vector3} force - The force/result vector.
	* @param {Number} delta - The time delta.
	* @return {Vector3} The force/result vector.
	*/
	calculate( vehicle, force /*, delta */ ) {

		const entity1 = this.entity1;
		const entity2 = this.entity2;

		// first we need to figure out where the two entities are going to be
		// in the future. This is approximated by determining the time
		// taken to reach the mid way point at the current time at max speed

		midPoint.addVectors( entity1.position, entity2.position ).multiplyScalar( 0.5 );
		const time = vehicle.position.distanceTo( midPoint ) / vehicle.maxSpeed;

		// now we have the time, we assume that entity 1 and entity 2 will
		// continue on a straight trajectory and extrapolate to get their future positions

		translation.copy( entity1.velocity ).multiplyScalar( time );
		predictedPosition1.addVectors( entity1.position, translation );

		translation.copy( entity2.velocity ).multiplyScalar( time );
		predictedPosition2.addVectors( entity2.position, translation );

		// calculate the mid point of these predicted positions

		midPoint.addVectors( predictedPosition1, predictedPosition2 ).multiplyScalar( 0.5 );

		// then steer to arrive at it

		this._arrive.deceleration = this.deceleration;
		this._arrive.target = midPoint;
		this._arrive.calculate( vehicle, force );

		return force;

	}

	/**
	* Transforms this instance into a JSON object.
	*
	* @return {Object} The JSON object.
	*/
	toJSON() {

		const json = super.toJSON();

		json.entity1 = this.entity1 ? this.entity1.uuid : null;
		json.entity2 = this.entity2 ? this.entity2.uuid : null;
		json.deceleration = this.deceleration;

		return json;

	}

	/**
	* Restores this instance from the given JSON object.
	*
	* @param {Object} json - The JSON object.
	* @return {InterposeBehavior} A reference to this behavior.
	*/
	fromJSON( json ) {

		super.fromJSON( json );

		this.entity1 = json.entity1;
		this.entity2 = json.entity2;
		this.deceleration = json.deceleration;

		return this;

	}

	/**
	* Restores UUIDs with references to GameEntity objects.
	*
	* @param {Map} entities - Maps game entities to UUIDs.
	* @return {InterposeBehavior} A reference to this behavior.
	*/
	resolveReferences( entities ) {

		this.entity1 = entities.get( this.entity1 ) || null;
		this.entity2 = entities.get( this.entity2 ) || null;

	}

}

const vector$1 = new Vector3();
const center = new Vector3();
const size = new Vector3();

const points = [
	new Vector3(),
	new Vector3(),
	new Vector3(),
	new Vector3(),
	new Vector3(),
	new Vector3(),
	new Vector3(),
	new Vector3()
];

/**
* Class representing an axis-aligned bounding box (AABB).
*
* @author {@link https://github.com/Mugen87|Mugen87}
*/
class AABB {

	/**
	* Constructs a new AABB with the given values.
	*
	* @param {Vector3} min - The minimum bounds of the AABB.
	* @param {Vector3} max - The maximum bounds of the AABB.
	*/
	constructor( min = new Vector3(), max = new Vector3() ) {

		/**
		* The minimum bounds of the AABB.
		* @type Vector3
		*/
		this.min = min;

		/**
		* The maximum bounds of the AABB.
		* @type Vector3
		*/
		this.max = max;

	}

	/**
	* Sets the given values to this AABB.
	*
	* @param {Vector3} min - The minimum bounds of the AABB.
	* @param {Vector3} max - The maximum bounds of the AABB.
	* @return {AABB} A reference to this AABB.
	*/
	set( min, max ) {

		this.min = min;
		this.max = max;

		return this;

	}

	/**
	* Copies all values from the given AABB to this AABB.
	*
	* @param {AABB} aabb - The AABB to copy.
	* @return {AABB} A reference to this AABB.
	*/
	copy( aabb ) {

		this.min.copy( aabb.min );
		this.max.copy( aabb.max );

		return this;

	}

	/**
	* Creates a new AABB and copies all values from this AABB.
	*
	* @return {AABB} A new AABB.
	*/
	clone() {

		return new this.constructor().copy( this );

	}

	/**
	* Ensures the given point is inside this AABB and stores
	* the result in the given vector.
	*
	* @param {Vector3} point - A point in 3D space.
	* @param {Vector3} result - The result vector.
	* @return {Vector3} The result vector.
	*/
	clampPoint( point, result ) {

		result.copy( point ).clamp( this.min, this.max );

		return result;

	}

	/**
	* Returns true if the given point is inside this AABB.
	*
	* @param {Vector3} point - A point in 3D space.
	* @return {Boolean} The result of the containments test.
	*/
	containsPoint( point ) {

		return point.x < this.min.x || point.x > this.max.x ||
			point.y < this.min.y || point.y > this.max.y ||
			point.z < this.min.z || point.z > this.max.z ? false : true;

	}

	/**
	* Expands this AABB by the given point. So after this method call,
	* the given point lies inside the AABB.
	*
	* @param {Vector3} point - A point in 3D space.
	* @return {AABB} A reference to this AABB.
	*/
	expand( point ) {

		this.min.min( point );
		this.max.max( point );

		return this;

	}

	/**
	* Computes the center point of this AABB and stores it into the given vector.
	*
	* @param {Vector3} result - The result vector.
	* @return {Vector3} The result vector.
	*/
	getCenter( result ) {

		return result.addVectors( this.min, this.max ).multiplyScalar( 0.5 );

	}

	/**
	* Computes the size (width, height, depth) of this AABB and stores it into the given vector.
	*
	* @param {Vector3} result - The result vector.
	* @return {Vector3} The result vector.
	*/
	getSize( result ) {

		return result.subVectors( this.max, this.min );

	}

	/**
	* Returns true if the given AABB intersects this AABB.
	*
	* @param {AABB} aabb - The AABB to test.
	* @return {Boolean} The result of the intersection test.
	*/
	intersectsAABB( aabb ) {

		return aabb.max.x < this.min.x || aabb.min.x > this.max.x ||
			aabb.max.y < this.min.y || aabb.min.y > this.max.y ||
			aabb.max.z < this.min.z || aabb.min.z > this.max.z ? false : true;

	}

	/**
	* Returns true if the given bounding sphere intersects this AABB.
	*
	* @param {BoundingSphere} sphere - The bounding sphere to test.
	* @return {Boolean} The result of the intersection test.
	*/
	intersectsBoundingSphere( sphere ) {

		// find the point on the AABB closest to the sphere center

		this.clampPoint( sphere.center, vector$1 );

		// if that point is inside the sphere, the AABB and sphere intersect.

		return vector$1.squaredDistanceTo( sphere.center ) <= ( sphere.radius * sphere.radius );

	}

	/**
	* Returns true if the given plane intersects this AABB.
	*
	* Reference: Testing Box Against Plane in Real-Time Collision Detection
	* by Christer Ericson (chapter 5.2.3)
	*
	* @param {Plane} plane - The plane to test.
	* @return {Boolean} The result of the intersection test.
	*/
	intersectsPlane( plane ) {

		const normal = plane.normal;

		this.getCenter( center );
		size.subVectors( this.max, center ); // positive extends

		// compute the projection interval radius of b onto L(t) = c + t * plane.normal

		const r = size.x * Math.abs( normal.x ) + size.y * Math.abs( normal.y ) + size.z * Math.abs( normal.z );

		// compute distance of box center from plane

		const s = plane.distanceToPoint( center );

		return Math.abs( s ) <= r;

	}

	/**
	* Returns the normal for a given point on this AABB's surface.
	*
	* @param {Vector3} point - The point on the surface
	* @param {Vector3} result - The result vector.
	* @return {Vector3} The result vector.
	*/
	getNormalFromSurfacePoint( point, result ) {

		// from https://www.gamedev.net/forums/topic/551816-finding-the-aabb-surface-normal-from-an-intersection-point-on-aabb/

		result.set( 0, 0, 0 );

		let distance;
		let minDistance = Infinity;

		this.getCenter( center );
		this.getSize( size );

		// transform point into local space of AABB

		vector$1.copy( point ).sub( center );

		// x-axis

		distance = Math.abs( size.x - Math.abs( vector$1.x ) );

		if ( distance < minDistance ) {

			minDistance = distance;
			result.set( 1 * Math.sign( vector$1.x ), 0, 0 );

		}

		// y-axis

		distance = Math.abs( size.y - Math.abs( vector$1.y ) );

		if ( distance < minDistance ) {

			minDistance = distance;
			result.set( 0, 1 * Math.sign( vector$1.y ), 0 );

		}

		// z-axis

		distance = Math.abs( size.z - Math.abs( vector$1.z ) );

		if ( distance < minDistance ) {

			result.set( 0, 0, 1 * Math.sign( vector$1.z ) );

		}

		return result;

	}

	/**
	* Sets the values of the AABB from the given center and size vector.
	*
	* @param {Vector3} center - The center point of the AABB.
	* @param {Vector3} size - The size of the AABB per axis.
	* @return {AABB} A reference to this AABB.
	*/
	fromCenterAndSize( center, size ) {

		vector$1.copy( size ).multiplyScalar( 0.5 ); // compute half size

		this.min.copy( center ).sub( vector$1 );
		this.max.copy( center ).add( vector$1 );

		return this;

	}

	/**
	* Computes an AABB that encloses the given set of points.
	*
	* @param {Array} points - An array of 3D vectors representing points in 3D space.
	* @return {AABB} A reference to this AABB.
	*/
	fromPoints( points ) {

		this.min.set( Infinity, Infinity, Infinity );
		this.max.set( - Infinity, - Infinity, - Infinity );

		for ( let i = 0, l = points.length; i < l; i ++ ) {

			this.expand( points[ i ] );

		}

		return this;

	}

	/**
	* Transforms this AABB with the given 4x4 transformation matrix.
	*
	* @param {Matrix4} matrix - The 4x4 transformation matrix.
	* @return {AABB} A reference to this AABB.
	*/
	applyMatrix4( matrix ) {

		const min = this.min;
		const max = this.max;

		points[ 0 ].set( min.x, min.y, min.z ).applyMatrix4( matrix );
		points[ 1 ].set( min.x, min.y, max.z ).applyMatrix4( matrix );
		points[ 2 ].set( min.x, max.y, min.z ).applyMatrix4( matrix );
		points[ 3 ].set( min.x, max.y, max.z ).applyMatrix4( matrix );
		points[ 4 ].set( max.x, min.y, min.z ).applyMatrix4( matrix );
		points[ 5 ].set( max.x, min.y, max.z ).applyMatrix4( matrix );
		points[ 6 ].set( max.x, max.y, min.z ).applyMatrix4( matrix );
		points[ 7 ].set( max.x, max.y, max.z ).applyMatrix4( matrix );

		return this.fromPoints( points );

	}

	/**
	* Returns true if the given AABB is deep equal with this AABB.
	*
	* @param {AABB} aabb - The AABB to test.
	* @return {Boolean} The result of the equality test.
	*/
	equals( aabb ) {

		return ( aabb.min.equals( this.min ) ) && ( aabb.max.equals( this.max ) );

	}

	/**
	* Transforms this instance into a JSON object.
	*
	* @return {Object} The JSON object.
	*/
	toJSON() {

		return {
			type: this.constructor.name,
			min: this.min.toArray( new Array() ),
			max: this.max.toArray( new Array() )
		};

	}

	/**
	* Restores this instance from the given JSON object.
	*
	* @param {Object} json - The JSON object.
	* @return {AABB} A reference to this AABB.
	*/
	fromJSON( json ) {

		this.min.fromArray( json.min );
		this.max.fromArray( json.max );

		return this;

	}

}

const aabb = new AABB();

/**
* Class representing a bounding sphere.
*
* @author {@link https://github.com/Mugen87|Mugen87}
*/
class BoundingSphere {

	/**
	* Constructs a new bounding sphere with the given values.
	*
	* @param {Vector3} center - The center position of the bounding sphere.
	* @param {Number} radius - The radius of the bounding sphere.
	*/
	constructor( center = new Vector3(), radius = 0 ) {

		/**
		* The center position of the bounding sphere.
		* @type Vector3
		*/
		this.center = center;

		/**
		* The radius of the bounding sphere.
		* @type Number
		*/
		this.radius = radius;

	}

	/**
	* Sets the given values to this bounding sphere.
	*
	* @param {Vector3} center - The center position of the bounding sphere.
	* @param {Number} radius - The radius of the bounding sphere.
	* @return {BoundingSphere} A reference to this bounding sphere.
	*/
	set( center, radius ) {

		this.center = center;
		this.radius = radius;

		return this;

	}

	/**
	* Copies all values from the given bounding sphere to this bounding sphere.
	*
	* @param {BoundingSphere} sphere - The bounding sphere to copy.
	* @return {BoundingSphere} A reference to this bounding sphere.
	*/
	copy( sphere ) {

		this.center.copy( sphere.center );
		this.radius = sphere.radius;

		return this;

	}

	/**
	* Creates a new bounding sphere and copies all values from this bounding sphere.
	*
	* @return {BoundingSphere} A new bounding sphere.
	*/
	clone() {

		return new this.constructor().copy( this );

	}

	/**
	* Ensures the given point is inside this bounding sphere and stores
	* the result in the given vector.
	*
	* @param {Vector3} point - A point in 3D space.
	* @param {Vector3} result - The result vector.
	* @return {Vector3} The result vector.
	*/
	clampPoint( point, result ) {

		result.copy( point );

		const squaredDistance = this.center.squaredDistanceTo( point );

		if ( squaredDistance > ( this.radius * this.radius ) ) {

			result.sub( this.center ).normalize();
			result.multiplyScalar( this.radius ).add( this.center );

		}

		return result;

	}

	/**
	* Returns true if the given point is inside this bounding sphere.
	*
	* @param {Vector3} point - A point in 3D space.
	* @return {Boolean} The result of the containments test.
	*/
	containsPoint( point ) {

		return ( point.squaredDistanceTo( this.center ) <= ( this.radius * this.radius ) );

	}

	/**
	* Returns true if the given bounding sphere intersects this bounding sphere.
	*
	* @param {BoundingSphere} sphere - The bounding sphere to test.
	* @return {Boolean} The result of the intersection test.
	*/
	intersectsBoundingSphere( sphere ) {

		const radius = this.radius + sphere.radius;

		return ( sphere.center.squaredDistanceTo( this.center ) <= ( radius * radius ) );

	}

	/**
	* Returns true if the given plane intersects this bounding sphere.
	*
	* Reference: Testing Sphere Against Plane in Real-Time Collision Detection
	* by Christer Ericson (chapter 5.2.2)
	*
	* @param {Plane} plane - The plane to test.
	* @return {Boolean} The result of the intersection test.
	*/
	intersectsPlane( plane ) {

		return Math.abs( plane.distanceToPoint( this.center ) ) <= this.radius;

	}

	/**
	* Returns the normal for a given point on this bounding sphere's surface.
	*
	* @param {Vector3} point - The point on the surface
	* @param {Vector3} result - The result vector.
	* @return {Vector3} The result vector.
	*/
	getNormalFromSurfacePoint( point, result ) {

		return result.subVectors( point, this.center ).normalize();

	}

	/**
	* Computes a bounding sphere that encloses the given set of points.
	*
	* @param {Array} points - An array of 3D vectors representing points in 3D space.
	* @return {BoundingSphere} A reference to this bounding sphere.
	*/
	fromPoints( points ) {

		// Using an AABB is a simple way to compute a bounding sphere for a given set
		// of points. However, there are other more complex algorithms that produce a
		// more tight bounding sphere. For now, this approach is a good start.

		aabb.fromPoints( points );

		aabb.getCenter( this.center );
		this.radius = this.center.distanceTo( aabb.max );

		return this;

	}

	/**
	* Transforms this bounding sphere with the given 4x4 transformation matrix.
	*
	* @param {Matrix4} matrix - The 4x4 transformation matrix.
	* @return {BoundingSphere} A reference to this bounding sphere.
	*/
	applyMatrix4( matrix ) {

		this.center.applyMatrix4( matrix );
		this.radius = this.radius * matrix.getMaxScale();

		return this;

	}

	/**
	* Returns true if the given bounding sphere is deep equal with this bounding sphere.
	*
	* @param {BoundingSphere} sphere - The bounding sphere to test.
	* @return {Boolean} The result of the equality test.
	*/
	equals( sphere ) {

		return ( sphere.center.equals( this.center ) ) && ( sphere.radius === this.radius );

	}

	/**
	* Transforms this instance into a JSON object.
	*
	* @return {Object} The JSON object.
	*/
	toJSON() {

		return {
			type: this.constructor.name,
			center: this.center.toArray( new Array() ),
			radius: this.radius
		};

	}

	/**
	* Restores this instance from the given JSON object.
	*
	* @param {Object} json - The JSON object.
	* @return {BoundingSphere} A reference to this bounding sphere.
	*/
	fromJSON( json ) {

		this.center.fromArray( json.center );
		this.radius = json.radius;

		return this;

	}

}

const v1$1 = new Vector3();
const edge1 = new Vector3();
const edge2 = new Vector3();
const normal = new Vector3();
const size$1 = new Vector3();
const matrix$1 = new Matrix4();
const inverse = new Matrix4();
const aabb$1 = new AABB();

/**
* Class representing a ray in 3D space.
*
* @author {@link https://github.com/Mugen87|Mugen87}
*/
class Ray {

	/**
	* Constructs a new ray with the given values.
	*
	* @param {Vector3} origin - The origin of the ray.
	* @param {Vector3} direction - The direction of the ray.
	*/
	constructor( origin = new Vector3(), direction = new Vector3() ) {

		/**
		* The origin of the ray.
		* @type Vector3
		*/
		this.origin = origin;

		/**
		* The direction of the ray.
		* @type Vector3
		*/
		this.direction = direction;

	}

	/**
	* Sets the given values to this ray.
	*
	* @param {Vector3} origin - The origin of the ray.
	* @param {Vector3} direction - The direction of the ray.
	* @return {Ray} A reference to this ray.
	*/
	set( origin, direction ) {

		this.origin = origin;
		this.direction = direction;

		return this;

	}

	/**
	* Copies all values from the given ray to this ray.
	*
	* @param {Ray} ray - The ray to copy.
	* @return {Ray} A reference to this ray.
	*/
	copy( ray ) {

		this.origin.copy( ray.origin );
		this.direction.copy( ray.direction );

		return this;

	}

	/**
	* Creates a new ray and copies all values from this ray.
	*
	* @return {Ray} A new ray.
	*/
	clone() {

		return new this.constructor().copy( this );

	}

	/**
	* Computes a position on the ray according to the given t value
	* and stores the result in the given 3D vector. The t value has a range of
	* [0, Infinity] where 0 means the position is equal with the origin of the ray.
	*
	* @param {Number} t - A scalar value representing a position on the ray.
	* @param {Vector3} result - The result vector.
	* @return {Vector3} The result vector.
	*/
	at( t, result ) {

		// t has to be zero or positive
		return result.copy( this.direction ).multiplyScalar( t ).add( this.origin );

	}

	/**
	* Performs a ray/sphere intersection test and stores the intersection point
	* to the given 3D vector. If no intersection is detected, *null* is returned.
	*
	* @param {BoundingSphere} sphere - A bounding sphere.
	* @param {Vector3} result - The result vector.
	* @return {Vector3} The result vector.
	*/
	intersectBoundingSphere( sphere, result ) {

		v1$1.subVectors( sphere.center, this.origin );
		const tca = v1$1.dot( this.direction );
		const d2 = v1$1.dot( v1$1 ) - tca * tca;
		const radius2 = sphere.radius * sphere.radius;

		if ( d2 > radius2 ) return null;

		const thc = Math.sqrt( radius2 - d2 );

		// t0 = first intersect point - entrance on front of sphere

		const t0 = tca - thc;

		// t1 = second intersect point - exit point on back of sphere

		const t1 = tca + thc;

		// test to see if both t0 and t1 are behind the ray - if so, return null

		if ( t0 < 0 && t1 < 0 ) return null;

		// test to see if t0 is behind the ray:
		// if it is, the ray is inside the sphere, so return the second exit point scaled by t1,
		// in order to always return an intersect point that is in front of the ray.

		if ( t0 < 0 ) return this.at( t1, result );

		// else t0 is in front of the ray, so return the first collision point scaled by t0

		return this.at( t0, result );

	}

	/**
	* Performs a ray/sphere intersection test. Returns either true or false if
	* there is a intersection or not.
	*
	* @param {BoundingSphere} sphere - A bounding sphere.
	* @return {boolean} Whether there is an intersection or not.
	*/
	intersectsBoundingSphere( sphere ) {

		const v1 = new Vector3();
		let squaredDistanceToPoint;

		const directionDistance = v1.subVectors( sphere.center, this.origin ).dot( this.direction );

		if ( directionDistance < 0 ) {

			// sphere's center behind the ray

			squaredDistanceToPoint = this.origin.squaredDistanceTo( sphere.center );

		} else {

			v1.copy( this.direction ).multiplyScalar( directionDistance ).add( this.origin );

			squaredDistanceToPoint = v1.squaredDistanceTo( sphere.center );

		}


		return squaredDistanceToPoint <= ( sphere.radius * sphere.radius );

	}

	/**
	* Performs a ray/AABB intersection test and stores the intersection point
	* to the given 3D vector. If no intersection is detected, *null* is returned.
	*
	* @param {AABB} aabb - An AABB.
	* @param {Vector3} result - The result vector.
	* @return {Vector3} The result vector.
	*/
	intersectAABB( aabb, result ) {

		let tmin, tmax, tymin, tymax, tzmin, tzmax;

		const invdirx = 1 / this.direction.x,
			invdiry = 1 / this.direction.y,
			invdirz = 1 / this.direction.z;

		const origin = this.origin;

		if ( invdirx >= 0 ) {

			tmin = ( aabb.min.x - origin.x ) * invdirx;
			tmax = ( aabb.max.x - origin.x ) * invdirx;

		} else {

			tmin = ( aabb.max.x - origin.x ) * invdirx;
			tmax = ( aabb.min.x - origin.x ) * invdirx;

		}

		if ( invdiry >= 0 ) {

			tymin = ( aabb.min.y - origin.y ) * invdiry;
			tymax = ( aabb.max.y - origin.y ) * invdiry;

		} else {

			tymin = ( aabb.max.y - origin.y ) * invdiry;
			tymax = ( aabb.min.y - origin.y ) * invdiry;

		}

		if ( ( tmin > tymax ) || ( tymin > tmax ) ) return null;

		// these lines also handle the case where tmin or tmax is NaN
		// (result of 0 * Infinity). x !== x returns true if x is NaN

		if ( tymin > tmin || tmin !== tmin ) tmin = tymin;

		if ( tymax < tmax || tmax !== tmax ) tmax = tymax;

		if ( invdirz >= 0 ) {

			tzmin = ( aabb.min.z - origin.z ) * invdirz;
			tzmax = ( aabb.max.z - origin.z ) * invdirz;

		} else {

			tzmin = ( aabb.max.z - origin.z ) * invdirz;
			tzmax = ( aabb.min.z - origin.z ) * invdirz;

		}

		if ( ( tmin > tzmax ) || ( tzmin > tmax ) ) return null;

		if ( tzmin > tmin || tmin !== tmin ) tmin = tzmin;

		if ( tzmax < tmax || tmax !== tmax ) tmax = tzmax;

		// return point closest to the ray (positive side)

		if ( tmax < 0 ) return null;

		return this.at( tmin >= 0 ? tmin : tmax, result );

	}

	/**
	* Performs a ray/AABB intersection test. Returns either true or false if
	* there is a intersection or not.
	*
	* @param {AABB} aabb - An axis-aligned bounding box.
	* @return {boolean} Whether there is an intersection or not.
	*/
	intersectsAABB( aabb ) {

		return this.intersectAABB( aabb, v1$1 ) !== null;

	}

	/**
	* Performs a ray/plane intersection test and stores the intersection point
	* to the given 3D vector. If no intersection is detected, *null* is returned.
	*
	* @param {Plane} plane - A plane.
	* @param {Vector3} result - The result vector.
	* @return {Vector3} The result vector.
	*/
	intersectPlane( plane, result ) {

		let t;

		const denominator = plane.normal.dot( this.direction );

		if ( denominator === 0 ) {

			if ( plane.distanceToPoint( this.origin ) === 0 ) {

				// ray is coplanar

				t = 0;

			} else {

				// ray is parallel, no intersection

				return null;

			}

		} else {

			t = - ( this.origin.dot( plane.normal ) + plane.constant ) / denominator;

		}

		// there is no intersection if t is negative

		return ( t >= 0 ) ? this.at( t, result ) : null;

	}

	/**
	* Performs a ray/plane intersection test. Returns either true or false if
	* there is a intersection or not.
	*
	* @param {Plane} plane - A plane.
	* @return {boolean} Whether there is an intersection or not.
	*/
	intersectsPlane( plane ) {

		// check if the ray lies on the plane first

		const distToPoint = plane.distanceToPoint( this.origin );

		if ( distToPoint === 0 ) {

			return true;

		}

		const denominator = plane.normal.dot( this.direction );

		if ( denominator * distToPoint < 0 ) {

			return true;

		}

		// ray origin is behind the plane (and is pointing behind it)

		return false;

	}

	/**
	* Performs a ray/OBB intersection test and stores the intersection point
	* to the given 3D vector. If no intersection is detected, *null* is returned.
	*
	* @param {OBB} obb - An orientend bounding box.
	* @param {Vector3} result - The result vector.
	* @return {Vector3} The result vector.
	*/
	intersectOBB( obb, result ) {

		// the idea is to perform the intersection test in the local space
		// of the OBB.

		obb.getSize( size$1 );
		aabb$1.fromCenterAndSize( v1$1.set( 0, 0, 0 ), size$1 );

		matrix$1.fromMatrix3( obb.rotation );
		matrix$1.setPosition( obb.center );

		// transform ray to the local space of the OBB

		localRay.copy( this ).applyMatrix4( matrix$1.getInverse( inverse ) );

		// perform ray <-> AABB intersection test

		if ( localRay.intersectAABB( aabb$1, result ) ) {

			// transform the intersection point back to world space

			return result.applyMatrix4( matrix$1 );

		} else {

			return null;

		}

	}

	/**
	* Performs a ray/OBB intersection test. Returns either true or false if
	* there is a intersection or not.
	*
	* @param {OBB} obb - An orientend bounding box.
	* @return {boolean} Whether there is an intersection or not.
	*/
	intersectsOBB( obb ) {

		return this.intersectOBB( obb, v1$1 ) !== null;

	}

	/**
	* Performs a ray/convex hull intersection test and stores the intersection point
	* to the given 3D vector. If no intersection is detected, *null* is returned.
	* The implementation is based on "Fast Ray-Convex Polyhedron Intersection"
	* by Eric Haines, GRAPHICS GEMS II
	*
	* @param {ConvexHull} convexHull - A convex hull.
	* @param {Vector3} result - The result vector.
	* @return {Vector3} The result vector.
	*/
	intersectConvexHull( convexHull, result ) {

		const faces = convexHull.faces;

		let tNear = - Infinity;
		let tFar = Infinity;

		for ( let i = 0, l = faces.length; i < l; i ++ ) {

			const face = faces[ i ];
			const plane = face.plane;

			const vN = plane.distanceToPoint( this.origin );
			const vD = plane.normal.dot( this.direction );

			// if the origin is on the positive side of a plane (so the plane can "see" the origin) and
			// the ray is turned away or parallel to the plane, there is no intersection

			if ( vN > 0 && vD >= 0 ) return null;

			// compute the distance from the ray’s origin to the intersection with the plane

			const t = ( vD !== 0 ) ? ( - vN / vD ) : 0;

			// only proceed if the distance is positive. since the ray has a direction, the intersection point
			// would lie "behind" the origin with a negative distance

			if ( t <= 0 ) continue;

			// now categorized plane as front-facing or back-facing

			if ( vD > 0 ) {

				//  plane faces away from the ray, so this plane is a back-face

				tFar = Math.min( t, tFar );

			} else {

				// front-face

				tNear = Math.max( t, tNear );

			}

			if ( tNear > tFar ) {

				// if tNear ever is greater than tFar, the ray must miss the convex hull

				return null;

			}

		}

		// evaluate intersection point

		// always try tNear first since its the closer intersection point

		if ( tNear !== - Infinity ) {

			this.at( tNear, result );

		} else {

			this.at( tFar, result );

		}

		return result;

	}

	/**
	* Performs a ray/convex hull intersection test. Returns either true or false if
	* there is a intersection or not.
	*
	* @param {ConvexHull} convexHull - A convex hull.
	* @return {boolean} Whether there is an intersection or not.
	*/
	intersectsConvexHull( convexHull ) {

		return this.intersectConvexHull( convexHull, v1$1 ) !== null;

	}

	/**
	* Performs a ray/triangle intersection test and stores the intersection point
	* to the given 3D vector. If no intersection is detected, *null* is returned.
	*
	* @param {Triangle} triangle - A triangle.
	* @param {Boolean} backfaceCulling - Whether back face culling is active or not.
	* @param {Vector3} result - The result vector.
	* @return {Vector3} The result vector.
	*/
	intersectTriangle( triangle, backfaceCulling, result ) {

		// reference: https://www.geometrictools.com/GTEngine/Include/Mathematics/GteIntrRay3Triangle3.h

		const a = triangle.a;
		const b = triangle.b;
		const c = triangle.c;

		edge1.subVectors( b, a );
		edge2.subVectors( c, a );
		normal.crossVectors( edge1, edge2 );

		let DdN = this.direction.dot( normal );
		let sign;

		if ( DdN > 0 ) {

			if ( backfaceCulling ) return null;
			sign = 1;

		} else if ( DdN < 0 ) {

			sign = - 1;
			DdN = - DdN;

		} else {

			return null;

		}

		v1$1.subVectors( this.origin, a );
		const DdQxE2 = sign * this.direction.dot( edge2.crossVectors( v1$1, edge2 ) );

		// b1 < 0, no intersection

		if ( DdQxE2 < 0 ) {

			return null;

		}

		const DdE1xQ = sign * this.direction.dot( edge1.cross( v1$1 ) );

		// b2 < 0, no intersection

		if ( DdE1xQ < 0 ) {

			return null;

		}

		// b1 + b2 > 1, no intersection

		if ( DdQxE2 + DdE1xQ > DdN ) {

			return null;

		}

		// line intersects triangle, check if ray does

		const QdN = - sign * v1$1.dot( normal );

		// t < 0, no intersection

		if ( QdN < 0 ) {

			return null;

		}

		// ray intersects triangle

		return this.at( QdN / DdN, result );

	}

	/**
	* Performs a ray/BVH intersection test and stores the intersection point
	* to the given 3D vector. If no intersection is detected, *null* is returned.
	*
	* @param {BVH} bvh - A BVH.
	* @param {Vector3} result - The result vector.
	* @return {Vector3} The result vector.
	*/
	intersectBVH( bvh, result ) {

		return bvh.root.intersectRay( this, result );

	}

	/**
	* Performs a ray/BVH intersection test. Returns either true or false if
	* there is a intersection or not.
	*
	* @param {BVH} bvh - A BVH.
	* @return {boolean} Whether there is an intersection or not.
	*/
	intersectsBVH( bvh ) {

		return bvh.root.intersectsRay( this );

	}

	/**
	* Transforms this ray by the given 4x4 matrix.
	*
	* @param {Matrix4} m - The 4x4 matrix.
	* @return {Ray} A reference to this ray.
	*/
	applyMatrix4( m ) {

		this.origin.applyMatrix4( m );
		this.direction.transformDirection( m );

		return this;

	}

	/**
	* Returns true if the given ray is deep equal with this ray.
	*
	* @param {Ray} ray - The ray to test.
	* @return {Boolean} The result of the equality test.
	*/
	equals( ray ) {

		return ray.origin.equals( this.origin ) && ray.direction.equals( this.direction );

	}

}

const localRay = new Ray();

const inverse$1 = new Matrix4();
const localPositionOfObstacle = new Vector3();
const localPositionOfClosestObstacle = new Vector3();
const intersectionPoint = new Vector3();
const boundingSphere = new BoundingSphere();

const ray = new Ray( new Vector3( 0, 0, 0 ), new Vector3( 0, 0, 1 ) );

/**
* This steering behavior produces a force so a vehicle avoids obstacles lying in its path.
*
* @author {@link https://github.com/Mugen87|Mugen87}
* @author {@link https://github.com/robp94|robp94}
* @augments SteeringBehavior
*/
class ObstacleAvoidanceBehavior extends SteeringBehavior {

	/**
	* Constructs a new obstacle avoidance behavior.
	*
	* @param {Array} obstacles - An Array with obstacle of type {@link GameEntity}.
	*/
	constructor( obstacles = new Array() ) {

		super();

		/**
		* An Array with obstacle of type {@link GameEntity}.
		* @type Array
		*/
		this.obstacles = obstacles;

		/**
		* This factor determines how much the vehicle decelerates if an intersection occurs.
		* @type Number
		* @default 0.2
		*/
		this.brakingWeight = 0.2;

		/**
		* Minimum length of the detection box used for intersection tests.
		* @type Number
		* @default 4
		*/
		this.dBoxMinLength = 4; //

	}

	/**
	* Calculates the steering force for a single simulation step.
	*
	* @param {Vehicle} vehicle - The game entity the force is produced for.
	* @param {Vector3} force - The force/result vector.
	* @param {Number} delta - The time delta.
	* @return {Vector3} The force/result vector.
	*/
	calculate( vehicle, force /*, delta */ ) {

		const obstacles = this.obstacles;

		// this will keep track of the closest intersecting obstacle

		let closestObstacle = null;

		// this will be used to track the distance to the closest obstacle

		let distanceToClosestObstacle = Infinity;

		// the detection box length is proportional to the agent's velocity

		const dBoxLength = this.dBoxMinLength + ( vehicle.getSpeed() / vehicle.maxSpeed ) * this.dBoxMinLength;

		vehicle.worldMatrix.getInverse( inverse$1 );

		for ( let i = 0, l = obstacles.length; i < l; i ++ ) {

			const obstacle = obstacles[ i ];

			if ( obstacle === vehicle ) continue;

			// calculate this obstacle's position in local space of the vehicle

			localPositionOfObstacle.copy( obstacle.position ).applyMatrix4( inverse$1 );

			// if the local position has a positive z value then it must lay behind the agent.
			// besides the absolute z value must be smaller than the length of the detection box

			if ( localPositionOfObstacle.z > 0 && Math.abs( localPositionOfObstacle.z ) < dBoxLength ) {

				// if the distance from the x axis to the object's position is less
				// than its radius + half the width of the detection box then there is a potential intersection

				const expandedRadius = obstacle.boundingRadius + vehicle.boundingRadius;

				if ( Math.abs( localPositionOfObstacle.x ) < expandedRadius ) {

					// do intersection test in local space of the vehicle

					boundingSphere.center.copy( localPositionOfObstacle );
					boundingSphere.radius = expandedRadius;

					ray.intersectBoundingSphere( boundingSphere, intersectionPoint );

					// compare distances

					if ( intersectionPoint.z < distanceToClosestObstacle ) {

						// save new minimum distance

						distanceToClosestObstacle = intersectionPoint.z;

						// save closest obstacle

						closestObstacle = obstacle;

						// save local position for force calculation

						localPositionOfClosestObstacle.copy( localPositionOfObstacle );

					}

				}

			}

		}

		// if we have found an intersecting obstacle, calculate a steering force away from it

		if ( closestObstacle !== null ) {

			// the closer the agent is to an object, the stronger the steering force should be

			const multiplier = 1 + ( ( dBoxLength - localPositionOfClosestObstacle.z ) / dBoxLength );

			// calculate the lateral force

			force.x = ( closestObstacle.boundingRadius - localPositionOfClosestObstacle.x ) * multiplier;

			// apply a braking force proportional to the obstacles distance from the vehicle

			force.z = ( closestObstacle.boundingRadius - localPositionOfClosestObstacle.z ) * this.brakingWeight;

			// finally, convert the steering vector from local to world space (just apply the rotation)

			force.applyRotation( vehicle.rotation );

		}

		return force;

	}

	/**
	* Transforms this instance into a JSON object.
	*
	* @return {Object} The JSON object.
	*/
	toJSON() {

		const json = super.toJSON();

		json.obstacles = new Array();
		json.brakingWeight = this.brakingWeight;
		json.dBoxMinLength = this.dBoxMinLength;

		// obstacles

		for ( let i = 0, l = this.obstacles.length; i < l; i ++ ) {

			json.obstacles.push( this.obstacles[ i ].uuid );

		}

		return json;

	}

	/**
	* Restores this instance from the given JSON object.
	*
	* @param {Object} json - The JSON object.
	* @return {ObstacleAvoidanceBehavior} A reference to this behavior.
	*/
	fromJSON( json ) {

		super.fromJSON( json );

		this.obstacles = json.obstacles;
		this.brakingWeight = json.brakingWeight;
		this.dBoxMinLength = json.dBoxMinLength;

		return this;

	}

	/**
	* Restores UUIDs with references to GameEntity objects.
	*
	* @param {Map} entities - Maps game entities to UUIDs.
	* @return {ObstacleAvoidanceBehavior} A reference to this behavior.
	*/
	resolveReferences( entities ) {

		const obstacles = this.obstacles;

		for ( let i = 0, l = obstacles.length; i < l; i ++ ) {

			obstacles[ i ] = entities.get( obstacles[ i ] );

		}


	}

}

const offsetWorld = new Vector3();
const toOffset = new Vector3();
const newLeaderVelocity = new Vector3();
const predictedPosition$1 = new Vector3();

/**
* This steering behavior produces a force that keeps a vehicle at a specified offset from a leader vehicle.
* Useful for creating formations.
*
* @author {@link https://github.com/Mugen87|Mugen87}
* @augments SteeringBehavior
*/
class OffsetPursuitBehavior extends SteeringBehavior {

	/**
	* Constructs a new offset pursuit behavior.
	*
	* @param {Vehicle} leader - The leader vehicle.
	* @param {Vector3} offset - The offset from the leader.
	*/
	constructor( leader = null, offset = new Vector3() ) {

		super();

		/**
		* The leader vehicle.
		* @type Vehicle
		*/
		this.leader = leader;

		/**
		* The offset from the leader.
		* @type Vector3
		*/
		this.offset = offset;

		// internal behaviors

		this._arrive = new ArriveBehavior();
		this._arrive.deceleration = 1.5;

	}

	/**
	* Calculates the steering force for a single simulation step.
	*
	* @param {Vehicle} vehicle - The game entity the force is produced for.
	* @param {Vector3} force - The force/result vector.
	* @param {Number} delta - The time delta.
	* @return {Vector3} The force/result vector.
	*/
	calculate( vehicle, force /*, delta */ ) {

		const leader = this.leader;
		const offset = this.offset;

		// calculate the offset's position in world space

		offsetWorld.copy( offset ).applyMatrix4( leader.worldMatrix );

		// calculate the vector that points from the vehicle to the offset position

		toOffset.subVectors( offsetWorld, vehicle.position );

		// the lookahead time is proportional to the distance between the leader
		// and the pursuer and is inversely proportional to the sum of both
		// agent's velocities

		const lookAheadTime = toOffset.length() / ( vehicle.maxSpeed + leader.getSpeed() );

		// calculate new velocity and predicted future position

		newLeaderVelocity.copy( leader.velocity ).multiplyScalar( lookAheadTime );

		predictedPosition$1.addVectors( offsetWorld, newLeaderVelocity );

		// now arrive at the predicted future position of the offset

		this._arrive.target = predictedPosition$1;
		this._arrive.calculate( vehicle, force );

		return force;

	}

	/**
	* Transforms this instance into a JSON object.
	*
	* @return {Object} The JSON object.
	*/
	toJSON() {

		const json = super.toJSON();

		json.leader = this.leader ? this.leader.uuid : null;
		json.offset = this.offset;

		return json;

	}

	/**
	* Restores this instance from the given JSON object.
	*
	* @param {Object} json - The JSON object.
	* @return {OffsetPursuitBehavior} A reference to this behavior.
	*/
	fromJSON( json ) {

		super.fromJSON( json );

		this.leader = json.leader;
		this.offset = json.offset;

		return this;

	}


	/**
	* Restores UUIDs with references to GameEntity objects.
	*
	* @param {Map} entities - Maps game entities to UUIDs.
	* @return {OffsetPursuitBehavior} A reference to this behavior.
	*/
	resolveReferences( entities ) {

		this.leader = entities.get( this.leader ) || null;

	}

}

const displacement$3 = new Vector3();
const vehicleDirection = new Vector3();
const evaderDirection = new Vector3();
const newEvaderVelocity = new Vector3();
const predictedPosition$2 = new Vector3();

/**
* This steering behavior is useful when an agent is required to intercept a moving agent.
*
* @author {@link https://github.com/Mugen87|Mugen87}
* @augments SteeringBehavior
*/
class PursuitBehavior extends SteeringBehavior {

	/**
	* Constructs a new pursuit behavior.
	*
	* @param {MovingEntity} evader - The agent to pursue.
	* @param {Number} predictionFactor - This factor determines how far the vehicle predicts the movement of the evader.
	*/
	constructor( evader = null, predictionFactor = 1 ) {

		super();

		/**
		* The agent to pursue.
		* @type MovingEntity
		* @default null
		*/
		this.evader = evader;

		/**
		* This factor determines how far the vehicle predicts the movement of the evader.
		* @type Number
		* @default 1
		*/
		this.predictionFactor = predictionFactor;

		// internal behaviors

		this._seek = new SeekBehavior();

	}

	/**
	* Calculates the steering force for a single simulation step.
	*
	* @param {Vehicle} vehicle - The game entity the force is produced for.
	* @param {Vector3} force - The force/result vector.
	* @param {Number} delta - The time delta.
	* @return {Vector3} The force/result vector.
	*/
	calculate( vehicle, force /*, delta */ ) {

		const evader = this.evader;

		displacement$3.subVectors( evader.position, vehicle.position );

		// 1. if the evader is ahead and facing the agent then we can just seek for the evader's current position

		vehicle.getDirection( vehicleDirection );
		evader.getDirection( evaderDirection );

		// first condition: evader must be in front of the pursuer

		const evaderAhead = displacement$3.dot( vehicleDirection ) > 0;

		// second condition: evader must almost directly facing the agent

		const facing = vehicleDirection.dot( evaderDirection ) < - 0.95;

		if ( evaderAhead === true && facing === true ) {

			this._seek.target = evader.position;
			this._seek.calculate( vehicle, force );
			return force;

		}

		// 2. evader not considered ahead so we predict where the evader will be

		// the lookahead time is proportional to the distance between the evader
		// and the pursuer. and is inversely proportional to the sum of the
		// agent's velocities

		let lookAheadTime = displacement$3.length() / ( vehicle.maxSpeed + evader.getSpeed() );
		lookAheadTime *= this.predictionFactor; // tweak the magnitude of the prediction

		// calculate new velocity and predicted future position

		newEvaderVelocity.copy( evader.velocity ).multiplyScalar( lookAheadTime );
		predictedPosition$2.addVectors( evader.position, newEvaderVelocity );

		// now seek to the predicted future position of the evader

		this._seek.target = predictedPosition$2;
		this._seek.calculate( vehicle, force );

		return force;

	}

	/**
	* Transforms this instance into a JSON object.
	*
	* @return {Object} The JSON object.
	*/
	toJSON() {

		const json = super.toJSON();

		json.evader = this.evader ? this.evader.uuid : null;
		json.predictionFactor = this.predictionFactor;

		return json;

	}

	/**
	* Restores this instance from the given JSON object.
	*
	* @param {Object} json - The JSON object.
	* @return {PursuitBehavior} A reference to this behavior.
	*/
	fromJSON( json ) {

		super.fromJSON( json );

		this.evader = json.evader;
		this.predictionFactor = json.predictionFactor;

		return this;

	}

	/**
	* Restores UUIDs with references to GameEntity objects.
	*
	* @param {Map} entities - Maps game entities to UUIDs.
	* @return {PursuitBehavior} A reference to this behavior.
	*/
	resolveReferences( entities ) {

		this.evader = entities.get( this.evader ) || null;

	}

}

const toAgent = new Vector3();

/**
* This steering produces a force that steers a vehicle away from those in its neighborhood region.
*
* @author {@link https://github.com/Mugen87|Mugen87}
* @augments SteeringBehavior
*/
class SeparationBehavior extends SteeringBehavior {

	/**
	* Constructs a new separation behavior.
	*/
	constructor() {

		super();

	}

	/**
	* Calculates the steering force for a single simulation step.
	*
	* @param {Vehicle} vehicle - The game entity the force is produced for.
	* @param {Vector3} force - The force/result vector.
	* @param {Number} delta - The time delta.
	* @return {Vector3} The force/result vector.
	*/
	calculate( vehicle, force /*, delta */ ) {

		const neighbors = vehicle.neighbors;

		for ( let i = 0, l = neighbors.length; i < l; i ++ ) {

			const neighbor = neighbors[ i ];

			toAgent.subVectors( vehicle.position, neighbor.position );

			let length = toAgent.length();

			// handle zero length if both vehicles have the same position

			if ( length === 0 ) length = 0.0001;

			// scale the force inversely proportional to the agents distance from its neighbor

			toAgent.normalize().divideScalar( length );

			force.add( toAgent );

		}

		return force;

	}

}

const targetWorld = new Vector3();
const randomDisplacement = new Vector3();

/**
* This steering behavior produces a steering force that will give the
* impression of a random walk through the agent’s environment. The behavior only
* produces a 2D force (XZ).
*
* @author {@link https://github.com/Mugen87|Mugen87}
* @augments SteeringBehavior
*/
class WanderBehavior extends SteeringBehavior {

	/**
	* Constructs a new wander behavior.
	*
	* @param {Number} radius - The radius of the wander circle for the wander behavior.
	* @param {Number} distance - The distance the wander circle is projected in front of the agent.
	* @param {Number} jitter - The maximum amount of displacement along the sphere each frame.
	*/
	constructor( radius = 1, distance = 5, jitter = 5 ) {

		super();

		/**
		* The radius of the constraining circle for the wander behavior.
		* @type Number
		* @default 1
		*/
		this.radius = radius;

		/**
		* The distance the wander sphere is projected in front of the agent.
		* @type Number
		* @default 5
		*/
		this.distance = distance;

		/**
		* The maximum amount of displacement along the sphere each frame.
		* @type Number
		* @default 5
		*/
		this.jitter = jitter;

		this._targetLocal = new Vector3();

		generateRandomPointOnCircle( this.radius, this._targetLocal );

	}

	/**
	* Calculates the steering force for a single simulation step.
	*
	* @param {Vehicle} vehicle - The game entity the force is produced for.
	* @param {Vector3} force - The force/result vector.
	* @param {Number} delta - The time delta.
	* @return {Vector3} The force/result vector.
	*/
	calculate( vehicle, force, delta ) {

		// this behavior is dependent on the update rate, so this line must be
		// included when using time independent frame rate

		const jitterThisTimeSlice = this.jitter * delta;

		// prepare random vector

		randomDisplacement.x = MathUtils.randFloat( - 1, 1 ) * jitterThisTimeSlice;
		randomDisplacement.z = MathUtils.randFloat( - 1, 1 ) * jitterThisTimeSlice;

		// add random vector to the target's position

		this._targetLocal.add( randomDisplacement );

		// re-project this new vector back onto a unit sphere

		this._targetLocal.normalize();

		// increase the length of the vector to the same as the radius of the wander sphere

		this._targetLocal.multiplyScalar( this.radius );

		// move the target into a position wanderDist in front of the agent

		targetWorld.copy( this._targetLocal );
		targetWorld.z += this.distance;

		// project the target into world space

		targetWorld.applyMatrix4( vehicle.worldMatrix );

		// and steer towards it

		force.subVectors( targetWorld, vehicle.position );

		return force;

	}

	/**
	* Transforms this instance into a JSON object.
	*
	* @return {Object} The JSON object.
	*/
	toJSON() {

		const json = super.toJSON();

		json.radius = this.radius;
		json.distance = this.distance;
		json.jitter = this.jitter;
		json._targetLocal = this._targetLocal.toArray( new Array() );

		return json;

	}

	/**
	* Restores this instance from the given JSON object.
	*
	* @param {Object} json - The JSON object.
	* @return {WanderBehavior} A reference to this behavior.
	*/
	fromJSON( json ) {

		super.fromJSON( json );

		this.radius = json.radius;
		this.distance = json.distance;
		this.jitter = json.jitter;
		this._targetLocal.fromArray( json._targetLocal );

		return this;

	}

}

//

function generateRandomPointOnCircle( radius, target ) {

	const theta = Math.random() * Math.PI * 2;

	target.x = radius * Math.cos( theta );
	target.z = radius * Math.sin( theta );

}

const force = new Vector3();

/**
* This class is responsible for managing the steering of a single vehicle. The steering manager
* can manage multiple steering behaviors and combine their produced force into a single one used
* by the vehicle.
*
* @author {@link https://github.com/Mugen87|Mugen87}
*/
class SteeringManager {

	/**
	* Constructs a new steering manager.
	*
	* @param {Vehicle} vehicle - The vehicle that owns this steering manager.
	*/
	constructor( vehicle ) {

		/**
		* The vehicle that owns this steering manager.
		* @type Vehicle
		*/
		this.vehicle = vehicle;

		/**
		* A list of all steering behaviors.
		* @type Array
		*/
		this.behaviors = new Array();

		this._steeringForce = new Vector3(); // the calculated steering force per simulation step
		this._typesMap = new Map(); // used for deserialization of custom behaviors

	}

	/**
	* Adds the given steering behavior to this steering manager.
	*
	* @param {SteeringBehavior} behavior - The steering behavior to add.
	* @return {SteeringManager} A reference to this steering manager.
	*/
	add( behavior ) {

		this.behaviors.push( behavior );
		behavior.onAdded(this.vehicle);
		return this;

	}

	/**
	* Removes the given steering behavior from this steering manager.
	*
	* @param {SteeringBehavior} behavior - The steering behavior to remove.
	* @return {SteeringManager} A reference to this steering manager.
	*/
	remove( behavior ) {

		const index = this.behaviors.indexOf( behavior );
		this.behaviors.splice( index, 1 );
		behavior.onRemoved(this.vehicle);
		return this;

	}

	/**
	* Clears the internal state of this steering manager.
	*
	* @return {SteeringManager} A reference to this steering manager.
	*/
	clear() {

		this.behaviors.length = 0;

		return this;

	}

	/**
	* Calculates the steering forces for all active steering behaviors and
	* combines it into a single result force. This method is called in
	* {@link Vehicle#update}.
	*
	* @param {Number} delta - The time delta.
	* @param {Vector3} result - The force/result vector.
	* @return {Vector3} The force/result vector.
	*/
	calculate( delta, result ) {

		this._calculateByOrder( delta );

		return result.copy( this._steeringForce );

	}

	// this method calculates how much of its max steering force the vehicle has
	// left to apply and then applies that amount of the force to add

	_accumulate( forceToAdd ) {

		// calculate how much steering force the vehicle has used so far

		const magnitudeSoFar = this._steeringForce.length();

		// calculate how much steering force remains to be used by this vehicle

		const magnitudeRemaining = this.vehicle.maxForce - magnitudeSoFar;

		// return false if there is no more force left to use

		if ( magnitudeRemaining <= 0 ) return false;

		// calculate the magnitude of the force we want to add

		const magnitudeToAdd = forceToAdd.length();

		// restrict the magnitude of forceToAdd, so we don't exceed the max force of the vehicle

		if ( magnitudeToAdd > magnitudeRemaining ) {

			forceToAdd.normalize().multiplyScalar( magnitudeRemaining );

		}

		// add force

		this._steeringForce.add( forceToAdd );

		return true;

	}

	_calculateByOrder( delta ) {

		const behaviors = this.behaviors;

		// reset steering force

		this._steeringForce.set( 0, 0, 0 );

		// calculate for each behavior the respective force

		for ( let i = 0, l = behaviors.length; i < l; i ++ ) {

			const behavior = behaviors[ i ];

			if ( behavior.active === true ) {

				force.set( 0, 0, 0 );

				behavior.calculate( this.vehicle, force, delta );

				force.multiplyScalar( behavior.weight );

				if ( this._accumulate( force ) === false ) return;

			}

		}

	}

	/**
	* Transforms this instance into a JSON object.
	*
	* @return {Object} The JSON object.
	*/
	toJSON() {

		const data = {
			type: 'SteeringManager',
			behaviors: new Array()
		};

		const behaviors = this.behaviors;

		for ( let i = 0, l = behaviors.length; i < l; i ++ ) {

			const behavior = behaviors[ i ];
			data.behaviors.push( behavior.toJSON() );

		}

		return data;

	}

	/**
	* Restores this instance from the given JSON object.
	*
	* @param {Object} json - The JSON object.
	* @return {SteeringManager} A reference to this steering manager.
	*/
	fromJSON( json ) {

		this.clear();

		const behaviorsJSON = json.behaviors;

		for ( let i = 0, l = behaviorsJSON.length; i < l; i ++ ) {

			const behaviorJSON = behaviorsJSON[ i ];
			const type = behaviorJSON.type;

			let behavior;

			switch ( type ) {

				case 'SteeringBehavior':
					behavior = new SteeringBehavior().fromJSON( behaviorJSON );
					break;

				case 'AlignmentBehavior':
					behavior = new AlignmentBehavior().fromJSON( behaviorJSON );
					break;

				case 'ArriveBehavior':
					behavior = new ArriveBehavior().fromJSON( behaviorJSON );
					break;

				case 'CohesionBehavior':
					behavior = new CohesionBehavior().fromJSON( behaviorJSON );
					break;

				case 'EvadeBehavior':
					behavior = new EvadeBehavior().fromJSON( behaviorJSON );
					break;

				case 'FleeBehavior':
					behavior = new FleeBehavior().fromJSON( behaviorJSON );
					break;

				case 'FollowPathBehavior':
					behavior = new FollowPathBehavior().fromJSON( behaviorJSON );
					break;

				case 'InterposeBehavior':
					behavior = new InterposeBehavior().fromJSON( behaviorJSON );
					break;

				case 'ObstacleAvoidanceBehavior':
					behavior = new ObstacleAvoidanceBehavior().fromJSON( behaviorJSON );
					break;

				case 'OffsetPursuitBehavior':
					behavior = new OffsetPursuitBehavior().fromJSON( behaviorJSON );
					break;

				case 'PursuitBehavior':
					behavior = new PursuitBehavior().fromJSON( behaviorJSON );
					break;

				case 'SeekBehavior':
					behavior = new SeekBehavior().fromJSON( behaviorJSON );
					break;

				case 'SeparationBehavior':
					behavior = new SeparationBehavior().fromJSON( behaviorJSON );
					break;

				case 'WanderBehavior':
					behavior = new WanderBehavior().fromJSON( behaviorJSON );
					break;

				default:

					// handle custom type

					const ctor = this._typesMap.get( type );

					if ( ctor !== undefined ) {

						behavior = new ctor().fromJSON( behaviorJSON );

					} else {

						Logger.warn( 'YUKA.SteeringManager: Unsupported steering behavior type:', type );
						continue;

					}

			}

			this.add( behavior );

		}

		return this;

	}

	/**
	 * Registers a custom type for deserialization. When calling {@link SteeringManager#fromJSON}
	 * the steering manager is able to pick the correct constructor in order to create custom
	 * steering behavior.
	 *
	 * @param {String} type - The name of the behavior type.
	 * @param {Function} constructor - The constructor function.
	 * @return {SteeringManager} A reference to this steering manager.
	 */
	registerType( type, constructor ) {

		this._typesMap.set( type, constructor );

		return this;

	}

	/**
	* Restores UUIDs with references to GameEntity objects.
	*
	* @param {Map} entities - Maps game entities to UUIDs.
	* @return {SteeringManager} A reference to this steering manager.
	*/
	resolveReferences( entities ) {

		const behaviors = this.behaviors;

		for ( let i = 0, l = behaviors.length; i < l; i ++ ) {

			const behavior = behaviors[ i ];
			behavior.resolveReferences( entities );


		}

		return this;

	}

}

/**
* This class can be used to smooth the result of a vector calculation. One use case
* is the smoothing of the velocity vector of game entities in order to avoid a shaky
* movements du to conflicting forces.
*
* @author {@link https://github.com/Mugen87|Mugen87}
* @author {@link https://github.com/robp94|robp94}
*/
class Smoother {

	/**
	* Constructs a new smoother.
	*
	* @param {Number} count - The amount of samples the smoother will use to average a vector.
	*/
	constructor( count = 10 ) {

		/**
		* The amount of samples the smoother will use to average a vector.
		* @type Number
		* @default 10
		*/
		this.count = count;

		this._history = new Array(); // this holds the history
		this._slot = 0; // the current sample slot

		// initialize history with Vector3s

		for ( let i = 0; i < this.count; i ++ ) {

			this._history[ i ] = new Vector3();

		}

	}

	/**
	* Calculates for the given value a smooth average.
	*
	* @param {Vector3} value - The value to smooth.
	* @param {Vector3} average - The calculated average.
	* @return {Vector3} The calculated average.
	*/
	calculate( value, average ) {

		// ensure, average is a zero vector

		average.set( 0, 0, 0 );

		// make sure the slot index wraps around

		if ( this._slot === this.count ) {

			this._slot = 0;

		}

		// overwrite the oldest value with the newest

		this._history[ this._slot ].copy( value );

		// increase slot index

		this._slot ++;

		// now calculate the average of the history array

		for ( let i = 0; i < this.count; i ++ ) {

			average.add( this._history[ i ] );

		}

		average.divideScalar( this.count );

		return average;

	}

	/**
	* Transforms this instance into a JSON object.
	*
	* @return {Object} The JSON object.
	*/
	toJSON() {

		const data = {
			type: this.constructor.name,
			count: this.count,
			_history: new Array(),
			_slot: this._slot
		};

		// history

		const history = this._history;

		for ( let i = 0, l = history.length; i < l; i ++ ) {

			const value = history[ i ];
			data._history.push( value.toArray( new Array() ) );

		}

		return data;

	}

	/**
	* Restores this instance from the given JSON object.
	*
	* @param {Object} json - The JSON object.
	* @return {Smoother} A reference to this smoother.
	*/
	fromJSON( json ) {

		this.count = json.count;
		this._slot = json._slot;

		// history

		const historyJSON = json._history;
		this._history.length = 0;

		for ( let i = 0, l = historyJSON.length; i < l; i ++ ) {

			const valueJSON = historyJSON[ i ];
			this._history.push( new Vector3().fromArray( valueJSON ) );

		}


		return this;

	}

}

const steeringForce = new Vector3();
const displacement$4 = new Vector3();
const acceleration = new Vector3();
const target$1 = new Vector3();
const velocitySmooth = new Vector3();

/**
* This type of game entity implements a special type of locomotion, the so called
* *Vehicle Model*. The class uses basic physical metrics in order to implement a
* realistic movement.
*
* @author {@link https://github.com/Mugen87|Mugen87}
* @author {@link https://github.com/robp94|robp94}
* @augments MovingEntity
*/
class Vehicle extends MovingEntity {

	/**
	* Constructs a new vehicle.
	*/
	constructor() {

		super();

		/**
		* The mass if the vehicle in kilogram.
		* @type Number
		* @default 1
		*/
		this.mass = 1;

		/**
		* The maximum force this entity can produce to power itself.
		* @type Number
		* @default 100
		*/
		this.maxForce = 100;

		/**
		* The steering manager of this vehicle.
		* @type SteeringManager
		*/
		this.steering = new SteeringManager( this );

		/**
		* An optional smoother to avoid shakiness due to conflicting steering behaviors.
		* @type Smoother
		* @default null
		*/
		this.smoother = null;

	}

	/**
	* This method is responsible for updating the position based on the force produced
	* by the internal steering manager.
	*
	* @param {Number} delta - The time delta.
	* @return {Vehicle} A reference to this vehicle.
	*/
	update( delta ) {

		// calculate steering force

		this.steering.calculate( delta, steeringForce );

		// acceleration = force / mass

		acceleration.copy( steeringForce ).divideScalar( this.mass );

		// update velocity

		this.velocity.add( acceleration.multiplyScalar( delta ) );

		// make sure vehicle does not exceed maximum speed

		if ( this.getSpeedSquared() > ( this.maxSpeed * this.maxSpeed ) ) {

			this.velocity.normalize();
			this.velocity.multiplyScalar( this.maxSpeed );

		}

		// calculate displacement

		displacement$4.copy( this.velocity ).multiplyScalar( delta );

		// calculate target position

		target$1.copy( this.position ).add( displacement$4 );

		// update the orientation if the vehicle has a non zero velocity

		if ( this.updateOrientation === true && this.smoother === null && this.getSpeedSquared() > 0.00000001 ) {

			this.lookAt( target$1 );

		}

		// update position

		this.position.copy( target$1 );

		// if smoothing is enabled, the orientation (not the position!) of the vehicle is
		// changed based on a post-processed velocity vector

		if ( this.updateOrientation === true && this.smoother !== null ) {

			this.smoother.calculate( this.velocity, velocitySmooth );

			displacement$4.copy( velocitySmooth ).multiplyScalar( delta );
			target$1.copy( this.position ).add( displacement$4 );

			this.lookAt( target$1 );

		}

		return this;

	}

	/**
	* Transforms this instance into a JSON object.
	*
	* @return {Object} The JSON object.
	*/
	toJSON() {

		const json = super.toJSON();

		json.mass = this.mass;
		json.maxForce = this.maxForce;
		json.steering = this.steering.toJSON();
		json.smoother = this.smoother ? this.smoother.toJSON() : null;

		return json;

	}

	/**
	* Restores this instance from the given JSON object.
	*
	* @param {Object} json - The JSON object.
	* @return {Vehicle} A reference to this vehicle.
	*/
	fromJSON( json ) {

		super.fromJSON( json );

		this.mass = json.mass;
		this.maxForce = json.maxForce;
		this.steering = new SteeringManager( this ).fromJSON( json.steering );
		this.smoother = json.smoother ? new Smoother().fromJSON( json.smoother ) : null;

		return this;

	}

	/**
	* Restores UUIDs with references to GameEntity objects.
	*
	* @param {Map} entities - Maps game entities to UUIDs.
	* @return {Vehicle} A reference to this vehicle.
	*/
	resolveReferences( entities ) {

		super.resolveReferences( entities );

		this.steering.resolveReferences( entities );

	}

}

/**
* Base class for representing trigger regions. It's a predefine region in 3D space,
* owned by one or more triggers. The shape of the trigger can be arbitrary.
*
* @author {@link https://github.com/Mugen87|Mugen87}
*/
class TriggerRegion {

	/**
	* Returns true if the bounding volume of the given game entity touches/intersects
	* the trigger region. Must be implemented by all concrete trigger regions.
	*
	* @param {GameEntity} entity - The entity to test.
	* @return {Boolean} Whether this trigger touches the given game entity or not.
	*/
	touching( /* entity */ ) {

		return false;

	}

	/**
	* Transforms this instance into a JSON object.
	*
	* @return {Object} The JSON object.
	*/
	toJSON() {

		return {
			type: this.constructor.name
		};

	}

	/**
	* Restores this instance from the given JSON object.
	*
	* @param {Object} json - The JSON object.
	* @return {TriggerRegion} A reference to this trigger region.
	*/
	fromJSON( /* json */ ) {

		return this;

	}

}

const boundingSphereEntity = new BoundingSphere();

/**
* Class for representing a rectangular trigger region as an AABB.
*
* @author {@link https://github.com/Mugen87|Mugen87}
* @augments TriggerRegion
*/
class RectangularTriggerRegion extends TriggerRegion {

	/**
	* Constructs a new rectangular trigger region with the given values.
	*
	* @param {Vector3} min - The minimum bounds of the region.
	* @param {Vector3} max - The maximum bounds of the region.
	*/
	constructor( min = new Vector3(), max = new Vector3() ) {

		super();

		this._aabb = new AABB( min, max );

	}

	get min() {

		return this._aabb.min;

	}

	set min( min ) {

		this._aabb.min = min;

	}

	get max() {

		return this._aabb.max;

	}

	set max( max ) {

		this._aabb.max = max;

	}

	/**
	* Creates the new rectangular trigger region from a given position and size.
	*
	* @param {Vector3} position - The center position of the trigger region.
	* @param {Vector3} size - The size of the trigger region per axis.
	* @return {RectangularTriggerRegion} A reference to this trigger region.
	*/
	fromPositionAndSize( position, size ) {

		this._aabb.fromCenterAndSize( position, size );

		return this;

	}

	/**
	* Returns true if the bounding volume of the given game entity touches/intersects
	* the trigger region.
	*
	* @param {GameEntity} entity - The entity to test.
	* @return {Boolean} Whether this trigger touches the given game entity or not.
	*/
	touching( entity ) {

		boundingSphereEntity.set( entity.position, entity.boundingRadius );

		return this._aabb.intersectsBoundingSphere( boundingSphereEntity );

	}

	/**
	* Transforms this instance into a JSON object.
	*
	* @return {Object} The JSON object.
	*/
	toJSON() {

		const json = super.toJSON();

		json._aabb = this._aabb.toJSON();

		return json;

	}

	/**
	* Restores this instance from the given JSON object.
	*
	* @param {Object} json - The JSON object.
	* @return {RectangularTriggerRegion} A reference to this trigger region.
	*/
	fromJSON( json ) {

		super.fromJSON( json );

		this._aabb.fromJSON( json._aabb );

		return this;

	}

}

const boundingSphereEntity$1 = new BoundingSphere();

/**
* Class for representing a spherical trigger region as a bounding sphere.
*
* @author {@link https://github.com/Mugen87|Mugen87}
* @augments TriggerRegion
*/
class SphericalTriggerRegion extends TriggerRegion {

	/**
	* Constructs a new spherical trigger region with the given values.
	*
	* @param {Vector3} position - The center position of the region.
	* @param {Number} radius - The radius of the region.
	*/
	constructor( position = new Vector3(), radius = 0 ) {

		super();

		this._boundingSphere = new BoundingSphere( position, radius );

	}

	get position() {

		return this._boundingSphere.center;

	}

	set position( position ) {

		this._boundingSphere.center = position;

	}

	get radius() {

		return this._boundingSphere.radius;

	}

	set radius( radius ) {

		this._boundingSphere.radius = radius;

	}

	/**
	* Returns true if the bounding volume of the given game entity touches/intersects
	* the trigger region.
	*
	* @param {GameEntity} entity - The entity to test.
	* @return {Boolean} Whether this trigger touches the given game entity or not.
	*/
	touching( entity ) {

		boundingSphereEntity$1.set( entity.position, entity.boundingRadius );

		return this._boundingSphere.intersectsBoundingSphere( boundingSphereEntity$1 );

	}

	/**
	* Transforms this instance into a JSON object.
	*
	* @return {Object} The JSON object.
	*/
	toJSON() {

		const json = super.toJSON();

		json._boundingSphere = this._boundingSphere.toJSON();

		return json;

	}

	/**
	* Restores this instance from the given JSON object.
	*
	* @param {Object} json - The JSON object.
	* @return {SphericalTriggerRegion} A reference to this trigger region.
	*/
	fromJSON( json ) {

		super.fromJSON( json );

		this._boundingSphere.fromJSON( json._boundingSphere );

		return this;

	}

}

/**
* Base class for representing triggers. A trigger generates an action if a game entity
* touches its trigger region, a predefine region in 3D space.
*
* @author {@link https://github.com/Mugen87|Mugen87}
*/
class Trigger {

	/**
	* Constructs a new trigger with the given values.
	*
	* @param {TriggerRegion} region - The region of the trigger.
	*/
	constructor( region = new TriggerRegion() ) {

		/**
		* Whether this trigger is active or not.
		* @type Boolean
		* @default true
		*/
		this.active = true;

		/**
		* The region of the trigger.
		* @type TriggerRegion
		*/
		this.region = region;

		//

		this._typesMap = new Map(); // used for deserialization of custom triggerRegions

	}

	/**
	* This method is called per simulation step for all game entities. If the game
	* entity touches the region of the trigger, the respective action is executed.
	*
	* @param {GameEntity} entity - The entity to test
	* @return {Trigger} A reference to this trigger.
	*/
	check( entity ) {

		if ( ( this.active === true ) && ( this.region.touching( entity ) === true ) ) {

			this.execute( entity );

		}

		return this;

	}

	/**
	* This method is called when the trigger should execute its action.
	* Must be implemented by all concrete triggers.
	*
	* @param {GameEntity} entity - The entity that touched the trigger region.
	* @return {Trigger} A reference to this trigger.
	*/
	execute( /* entity */ ) {}

	/**
	* Triggers can have internal states. This method is called per simulation step
	* and can be used to update the trigger.
	*
	* @param {Number} delta - The time delta value.
	* @return {Trigger} A reference to this trigger.
	*/
	update( /* delta */ ) {}

	/**
	* Transforms this instance into a JSON object.
	*
	* @return {Object} The JSON object.
	*/
	toJSON() {

		return {
			type: this.constructor.name,
			active: this.active,
			region: this.region.toJSON()
		};

	}

	/**
	* Restores this instance from the given JSON object.
	*
	* @param {Object} json - The JSON object.
	* @return {Trigger} A reference to this trigger.
	*/
	fromJSON( json ) {

		this.active = json.active;

		const regionJSON = json.region;
		let type = regionJSON.type;

		switch ( type ) {

			case 'TriggerRegion':
				this.region = new TriggerRegion().fromJSON( regionJSON );
				break;

			case 'RectangularTriggerRegion':
				this.region = new RectangularTriggerRegion().fromJSON( regionJSON );
				break;

			case 'SphericalTriggerRegion':
				this.region = new SphericalTriggerRegion().fromJSON( regionJSON );
				break;

			default:
				// handle custom type

				const ctor = this._typesMap.get( type );

				if ( ctor !== undefined ) {

					this.region = new ctor().fromJSON( regionJSON );

				} else {

					Logger.warn( 'YUKA.Trigger: Unsupported trigger region type:', regionJSON.type );

				}

		}

		return this;

	}

	/**
	 * Registers a custom type for deserialization. When calling {@link Trigger#fromJSON}
	 * the trigger is able to pick the correct constructor in order to create custom
	 * trigger regions.
	 *
	 * @param {String} type - The name of the trigger region.
	 * @param {Function} constructor - The constructor function.
	 * @return {Trigger} A reference to this trigger.
	 */
	registerType( type, constructor ) {

		this._typesMap.set( type, constructor );

		return this;

	}

}

const candidates = new Array();

/**
* This class is used for managing all central objects of a game like
* game entities and triggers.
*
* @author {@link https://github.com/Mugen87|Mugen87}
*/
class EntityManager {

	/**
	* Constructs a new entity manager.
	*/
	constructor() {

		/**
		* A list of {@link GameEntity game entities }.
		* @type Array
		*/
		this.entities = new Array();

		/**
		* A list of {@link Trigger triggers }.
		* @type Array
		*/
		this.triggers = new Array();

		/**
		* A reference to a spatial index.
		* @type CellSpacePartitioning
		* @default null
		*/
		this.spatialIndex = null;

		this._indexMap = new Map(); // used by spatial indices
		this._typesMap = new Map(); // used for deserialization of custom entities
		this._messageDispatcher = new MessageDispatcher();

	}

	/**
	* Adds a game entity to this entity manager.
	*
	* @param {GameEntity} entity - The game entity to add.
	* @return {EntityManager} A reference to this entity manager.
	*/
	add( entity ) {

		this.entities.push( entity );

		entity.manager = this;

		return this;

	}

	/**
	* Removes a game entity from this entity manager.
	*
	* @param {GameEntity} entity - The game entity to remove.
	* @return {EntityManager} A reference to this entity manager.
	*/
	remove( entity ) {

		const index = this.entities.indexOf( entity );
		this.entities.splice( index, 1 );

		entity.manager = null;

		return this;

	}

	/**
	* Adds a trigger to this entity manager.
	*
	* @param {Trigger} trigger - The trigger to add.
	* @return {EntityManager} A reference to this entity manager.
	*/
	addTrigger( trigger ) {

		this.triggers.push( trigger );

		return this;

	}

	/**
	* Removes a trigger to this entity manager.
	*
	* @param {Trigger} trigger - The trigger to remove.
	* @return {EntityManager} A reference to this entity manager.
	*/
	removeTrigger( trigger ) {

		const index = this.triggers.indexOf( trigger );
		this.triggers.splice( index, 1 );

		return this;

	}

	/**
	* Clears the internal state of this entity manager.
	*
	* @return {EntityManager} A reference to this entity manager.
	*/
	clear() {

		this.entities.length = 0;
		this.triggers.length = 0;

		this._messageDispatcher.clear();

		return this;

	}

	/**
	* Returns an entity by the given name. If no game entity is found, *null*
	* is returned. This method should be used once (e.g. at {@link GameEntity#start})
	* and the result should be cached for later use.
	*
	* @param {String} name - The name of the game entity.
	* @return {GameEntity} The found game entity.
	*/
	getEntityByName( name ) {

		const entities = this.entities;

		for ( let i = 0, l = entities.length; i < l; i ++ ) {

			const entity = entities[ i ];

			if ( entity.name === name ) return entity;

		}

		return null;

	}

	/**
	* The central update method of this entity manager. Updates all
	* game entities, triggers and delayed messages.
	*
	* @param {Number} delta - The time delta.
	* @return {EntityManager} A reference to this entity manager.
	*/
	update( delta ) {

		const entities = this.entities;
		const triggers = this.triggers;

		// update entities

		for ( let i = ( entities.length - 1 ); i >= 0; i -- ) {

			const entity = entities[ i ];

			this.updateEntity( entity, delta );

		}

		// update triggers

		for ( let i = ( triggers.length - 1 ); i >= 0; i -- ) {

			const trigger = triggers[ i ];

			this.updateTrigger( trigger, delta );

		}

		// handle messaging

		this._messageDispatcher.dispatchDelayedMessages( delta );

		return this;

	}

	/**
	* Updates a single entity.
	*
	* @param {GameEntity} entity - The game entity to update.
	* @param {Number} delta - The time delta.
	* @return {EntityManager} A reference to this entity manager.
	*/
	updateEntity( entity, delta ) {

		if ( entity.active === true ) {

			this.updateNeighborhood( entity );

			//

			if ( entity._started === false ) {

				entity.start();

				entity._started = true;

			}

			//

			entity.update( delta );
			entity.updateWorldMatrix();

			//

			const children = entity.children;

			for ( let i = ( children.length - 1 ); i >= 0; i -- ) {

				const child = children[ i ];

				this.updateEntity( child, delta );

			}

			//

			if ( this.spatialIndex !== null ) {

				let currentIndex = this._indexMap.get( entity ) || - 1;
				currentIndex = this.spatialIndex.updateEntity( entity, currentIndex );
				this._indexMap.set( entity, currentIndex );

			}

			//

			const renderComponent = entity._renderComponent;
			const renderComponentCallback = entity._renderComponentCallback;

			if ( renderComponent !== null && renderComponentCallback !== null ) {

				renderComponentCallback( entity, renderComponent );

			}

		}

		return this;

	}

	/**
	* Updates the neighborhood of a single game entity.
	*
	* @param {GameEntity} entity - The game entity to update.
	* @return {EntityManager} A reference to this entity manager.
	*/
	updateNeighborhood( entity ) {

		if ( entity.updateNeighborhood === true ) {

			entity.neighbors.length = 0;

			// determine candidates

			if ( this.spatialIndex !== null ) {

				this.spatialIndex.query( entity.position, entity.neighborhoodRadius, candidates );

			} else {

				// worst case runtime complexity with O(n²)

				candidates.length = 0;
				candidates.push( ...this.entities );

			}

			// verify if candidates are within the predefined range

			const neighborhoodRadiusSq = ( entity.neighborhoodRadius * entity.neighborhoodRadius );

			for ( let i = 0, l = candidates.length; i < l; i ++ ) {

				const candidate = candidates[ i ];

				if ( entity !== candidate && candidate.active === true ) {

					const distanceSq = entity.position.squaredDistanceTo( candidate.position );

					if ( distanceSq <= neighborhoodRadiusSq ) {

						entity.neighbors.push( candidate );

					}

				}

			}

		}

		return this;

	}

	/**
	* Updates a single trigger.
	*
	* @param {Trigger} trigger - The trigger to update.
	* @return {EntityManager} A reference to this entity manager.
	*/
	updateTrigger( trigger, delta ) {

		if ( trigger.active === true ) {

			trigger.update( delta );

			const entities = this.entities;

			for ( let i = ( entities.length - 1 ); i >= 0; i -- ) {

				const entity = entities[ i ];

				if ( entity.active === true && entity.canAcitivateTrigger ) {

					trigger.check( entity );

				}

			}

		}

		return this;

	}

	/**
	* Interface for game entities so they can send messages to other game entities.
	*
	* @param {GameEntity} sender - The sender.
	* @param {GameEntity} receiver - The receiver.
	* @param {String} message - The actual message.
	* @param {Number} delay - A time value in millisecond used to delay the message dispatching.
	* @param {Object} data - An object for custom data.
	* @return {EntityManager} A reference to this entity manager.
	*/
	sendMessage( sender, receiver, message, delay, data ) {

		this._messageDispatcher.dispatch( sender, receiver, message, delay, data );

		return this;

	}

	/**
	* Transforms this instance into a JSON object.
	*
	* @return {Object} The JSON object.
	*/
	toJSON() {

		const data = {
			type: this.constructor.name,
			entities: new Array(),
			triggers: new Array(),
			_messageDispatcher: this._messageDispatcher.toJSON()
		};

		// entities

		function processEntity( entity ) {

			data.entities.push( entity.toJSON() );

			for ( let i = 0, l = entity.children.length; i < l; i ++ ) {

				processEntity( entity.children[ i ] );

			}

		}

		for ( let i = 0, l = this.entities.length; i < l; i ++ ) {

			// recursively process all entities

			processEntity( this.entities[ i ] );

		}

		// triggers

		for ( let i = 0, l = this.triggers.length; i < l; i ++ ) {

			const trigger = this.triggers[ i ];
			data.triggers.push( trigger.toJSON() );

		}

		return data;

	}

	/**
	* Restores this instance from the given JSON object.
	*
	* @param {Object} json - The JSON object.
	* @return {EntityManager} A reference to this entity manager.
	*/
	fromJSON( json ) {

		this.clear();

		const entitiesJSON = json.entities;
		const triggersJSON = json.triggers;
		const _messageDispatcherJSON = json._messageDispatcher;

		// entities

		const entitiesMap = new Map();

		for ( let i = 0, l = entitiesJSON.length; i < l; i ++ ) {

			const entityJSON = entitiesJSON[ i ];
			const type = entityJSON.type;

			let entity;

			switch ( type ) {

				case 'GameEntity':
					entity = new GameEntity().fromJSON( entityJSON );
					break;

				case 'MovingEntity':
					entity = new MovingEntity().fromJSON( entityJSON );
					break;

				case 'Vehicle':
					entity = new Vehicle().fromJSON( entityJSON );
					break;

				default:

					// handle custom type

					const ctor = this._typesMap.get( type );

					if ( ctor !== undefined ) {

						entity = new ctor().fromJSON( entityJSON );

					} else {

						Logger.warn( 'YUKA.EntityManager: Unsupported entity type:', type );
						continue;

					}

			}

			entitiesMap.set( entity.uuid, entity );

			if ( entity.parent === null ) this.add( entity );

		}

		// resolve UUIDs to game entity objects

		for ( let entity of entitiesMap.values() ) {

			entity.resolveReferences( entitiesMap );

		}

		// triggers

		for ( let i = 0, l = triggersJSON.length; i < l; i ++ ) {

			const triggerJSON = triggersJSON[ i ];
			const type = triggerJSON.type;

			let trigger;

			if ( type === 'Trigger' ) {

				trigger = new Trigger().fromJSON( triggerJSON );

			} else {

				// handle custom type

				const ctor = this._typesMap.get( type );

				if ( ctor !== undefined ) {

					trigger = new ctor().fromJSON( triggerJSON );

				} else {

					Logger.warn( 'YUKA.EntityManager: Unsupported trigger type:', type );
					continue;

				}

			}

			this.addTrigger( trigger );

		}

		// restore delayed messages

		this._messageDispatcher.fromJSON( _messageDispatcherJSON );

		return this;

	}

	/**
	* Registers a custom type for deserialization. When calling {@link EntityManager#fromJSON}
	* the entity manager is able to pick the correct constructor in order to create custom
	* game entities or triggers.
	*
	* @param {String} type - The name of the entity or trigger type.
	* @param {Function} constructor - The constructor function.
	* @return {EntityManager} A reference to this entity manager.
	*/
	registerType( type, constructor ) {

		this._typesMap.set( type, constructor );

		return this;

	}

}

/**
* Other classes can inherit from this class in order to provide an
* event based API. Useful for controls development.
*
* @author {@link https://github.com/Mugen87|Mugen87}
*/

class EventDispatcher {

	/**
	* Constructs a new event dispatcher.
	*/
	constructor() {

		this._events = new Map();

	}

	/**
	* Adds an event listener for the given event type.
	*
	* @param {String} type - The event type.
	* @param {Function} listener - The event listener to add.
	*/
	addEventListener( type, listener ) {

		const events = this._events;

		if ( events.has( type ) === false ) {

			events.set( type, new Array() );

		}

		const listeners = events.get( type );

		if ( listeners.indexOf( listener ) === - 1 ) {

			listeners.push( listener );

		}

	}

	/**
	* Removes the given event listener for the given event type.
	*
	* @param {String} type - The event type.
	* @param {Function} listener - The event listener to remove.
	*/
	removeEventListener( type, listener ) {

		const events = this._events;
		const listeners = events.get( type );

		if ( listeners !== undefined ) {

			const index = listeners.indexOf( listener );

			if ( index !== - 1 ) listeners.splice( index, 1 );

		}

	}

	/**
	* Returns true if the given event listener is set for the given event type.
	*
	* @param {String} type - The event type.
	* @param {Function} listener - The event listener to add.
	* @return {Boolean} Whether the given event listener is set for the given event type or not.
	*/
	hasEventListener( type, listener ) {

		const events = this._events;
		const listeners = events.get( type );

		return ( listeners !== undefined ) && ( listeners.indexOf( listener ) !== - 1 );

	}

	/**
	* Dispatches an event to all respective event listeners.
	*
	* @param {Object} event - The event object.
	*/
	dispatchEvent( event ) {

		const events = this._events;
		const listeners = events.get( event.type );

		if ( listeners !== undefined ) {

			event.target = this;

			for ( let i = 0, l = listeners.length; i < l; i ++ ) {

				listeners[ i ].call( this, event );

			}

		}

	}

}

const v1$2 = new Vector3();
const v2 = new Vector3();
const d = new Vector3();

/**
* Class representing a plane in 3D space. The plane is specified in Hessian normal form.
*
* @author {@link https://github.com/Mugen87|Mugen87}
*/
class Plane {

	/**
	* Constructs a new plane with the given values.
	*
	* @param {Vector3} normal - The normal vector of the plane.
	* @param {Number} constant - The distance of the plane from the origin.
	*/
	constructor( normal = new Vector3( 0, 0, 1 ), constant = 0 ) {

		/**
		* The normal vector of the plane.
		* @type Vector3
		*/
		this.normal = normal;

		/**
		* The distance of the plane from the origin.
		* @type Number
		*/
		this.constant = constant;

	}

	/**
	* Sets the given values to this plane.
	*
	* @param {Vector3} normal - The normal vector of the plane.
	* @param {Number} constant - The distance of the plane from the origin.
	* @return {Plane} A reference to this plane.
	*/
	set( normal, constant ) {

		this.normal = normal;
		this.constant = constant;

		return this;

	}

	/**
	* Copies all values from the given plane to this plane.
	*
	* @param {Plane} plane - The plane to copy.
	* @return {Plane} A reference to this plane.
	*/
	copy( plane ) {

		this.normal.copy( plane.normal );
		this.constant = plane.constant;

		return this;

	}

	/**
	* Creates a new plane and copies all values from this plane.
	*
	* @return {Plane} A new plane.
	*/
	clone() {

		return new this.constructor().copy( this );

	}

	/**
	* Computes the signed distance from the given 3D vector to this plane.
	* The sign of the distance indicates the half-space in which the points lies.
	* Zero means the point lies on the plane.
	*
	* @param {Vector3} point - A point in 3D space.
	* @return {Number} The signed distance.
	*/
	distanceToPoint( point ) {

		return this.normal.dot( point ) + this.constant;

	}

	/**
	* Sets the values of the plane from the given normal vector and a coplanar point.
	*
	* @param {Vector3} normal - A normalized vector.
	* @param {Vector3} point - A coplanar point.
	* @return {Plane} A reference to this plane.
	*/
	fromNormalAndCoplanarPoint( normal, point ) {

		this.normal.copy( normal );
		this.constant = - point.dot( this.normal );

		return this;

	}

	/**
	* Sets the values of the plane from three given coplanar points.
	*
	* @param {Vector3} a - A coplanar point.
	* @param {Vector3} b - A coplanar point.
	* @param {Vector3} c - A coplanar point.
	* @return {Plane} A reference to this plane.
	*/
	fromCoplanarPoints( a, b, c ) {

		v1$2.subVectors( c, b ).cross( v2.subVectors( a, b ) ).normalize();

		this.fromNormalAndCoplanarPoint( v1$2, a );

		return this;

	}

	/**
	* Performs a plane/plane intersection test and stores the intersection point
	* to the given 3D vector. If no intersection is detected, *null* is returned.
	*
	* Reference: Intersection of Two Planes in Real-Time Collision Detection
	* by Christer Ericson (chapter 5.4.4)
	*
	* @param {Plane} plane - The plane to test.
	* @param {Vector3} result - The result vector.
	* @return {Vector3} The result vector.
	*/
	intersectPlane( plane, result ) {

		// compute direction of intersection line

		d.crossVectors( this.normal, plane.normal );

		// if d is zero, the planes are parallel (and separated)
		// or coincident, so they’re not considered intersecting

		const denom = d.dot( d );

		if ( denom === 0 ) return null;

		// compute point on intersection line

		v1$2.copy( plane.normal ).multiplyScalar( this.constant );
		v2.copy( this.normal ).multiplyScalar( plane.constant );

		result.crossVectors( v1$2.sub( v2 ), d ).divideScalar( denom );

		return result;

	}

	/**
	* Returns true if the given plane intersects this plane.
	*
	* @param {Plane} plane - The plane to test.
	* @return {Boolean} The result of the intersection test.
	*/
	intersectsPlane( plane ) {

		const d = this.normal.dot( plane.normal );

		return ( Math.abs( d ) !== 1 );

	}

	/**
	* Projects the given point onto the plane. The result is written
	* to the given vector.
	*
	* @param {Vector3} point - The point to project onto the plane.
	* @param {Vector3} result - The projected point.
	* @return {Vector3} The projected point.
	*/
	projectPoint( point, result ) {

		v1$2.copy( this.normal ).multiplyScalar( this.distanceToPoint( point ) );

		result.subVectors( point, v1$2 );

		return result;

	}

	/**
	* Returns true if the given plane is deep equal with this plane.
	*
	* @param {Plane} plane - The plane to test.
	* @return {Boolean} The result of the equality test.
	*/
	equals( plane ) {

		return plane.normal.equals( this.normal ) && plane.constant === this.constant;

	}

}

const boundingSphere$1 = new BoundingSphere();
const triangle = { a: new Vector3(), b: new Vector3(), c: new Vector3() };
const rayLocal = new Ray();
const plane = new Plane();
const inverseMatrix = new Matrix4();
const closestIntersectionPoint = new Vector3();
const closestTriangle = { a: new Vector3(), b: new Vector3(), c: new Vector3() };

/**
* Class for representing a polygon mesh. The faces consist of triangles.
*
* @author {@link https://github.com/Mugen87|Mugen87}
*/
class MeshGeometry {

	/**
	* Constructs a new mesh geometry.
	*
	* @param {TypedArray} vertices - The vertex buffer (Float32Array).
	* @param {TypedArray} indices - The index buffer (Uint16Array/Uint32Array).
	*/
	constructor( vertices = new Float32Array(), indices = null ) {

		this.vertices = vertices;
		this.indices = indices;

		this.backfaceCulling = true;

		this.aabb = new AABB();
		this.boundingSphere = new BoundingSphere();

		this.computeBoundingVolume();

	}

	/**
	* Computes the internal bounding volumes of this mesh geometry.
	*
	* @return {MeshGeometry} A reference to this mesh geometry.
	*/
	computeBoundingVolume() {

		const vertices = this.vertices;
		const vertex = new Vector3();

		const aabb = this.aabb;
		const boundingSphere = this.boundingSphere;

		// compute AABB

		aabb.min.set( Infinity, Infinity, Infinity );
		aabb.max.set( - Infinity, - Infinity, - Infinity );

		for ( let i = 0, l = vertices.length; i < l; i += 3 ) {

			vertex.x = vertices[ i ];
			vertex.y = vertices[ i + 1 ];
			vertex.z = vertices[ i + 2 ];

			aabb.expand( vertex );

		}

		// compute bounding sphere

		aabb.getCenter( boundingSphere.center );
		boundingSphere.radius = boundingSphere.center.distanceTo( aabb.max );

		return this;

	}

	/**
	 * Performs a ray intersection test with the geometry of the obstacle and stores
	 * the intersection point in the given result vector. If no intersection is detected,
	 * *null* is returned.
	 *
	 * @param {Ray} ray - The ray to test.
	 * @param {Matrix4} worldMatrix - The matrix that transforms the geometry to world space.
	 * @param {Boolean} closest - Whether the closest intersection point should be computed or not.
	 * @param {Vector3} intersectionPoint - The intersection point.
	 * @param {Vector3} normal - The normal vector of the respective triangle.
	 * @return {Vector3} The result vector.
	 */
	intersectRay( ray, worldMatrix, closest, intersectionPoint, normal = null ) {

		// check bounding sphere first in world space

		boundingSphere$1.copy( this.boundingSphere ).applyMatrix4( worldMatrix );

		if ( ray.intersectsBoundingSphere( boundingSphere$1 ) ) {

			// transform the ray into the local space of the obstacle

			worldMatrix.getInverse( inverseMatrix );
			rayLocal.copy( ray ).applyMatrix4( inverseMatrix );

			// check AABB in local space since its more expensive to convert an AABB to world space than a bounding sphere

			if ( rayLocal.intersectsAABB( this.aabb ) ) {

				// now perform more expensive test with all triangles of the geometry

				const vertices = this.vertices;
				const indices = this.indices;

				let minDistance = Infinity;
				let found = false;

				if ( indices === null ) {

					// non-indexed geometry

					for ( let i = 0, l = vertices.length; i < l; i += 9 ) {

						triangle.a.set( vertices[ i ], vertices[ i + 1 ], vertices[ i + 2 ] );
						triangle.b.set( vertices[ i + 3 ], vertices[ i + 4 ], vertices[ i + 5 ] );
						triangle.c.set( vertices[ i + 6 ], vertices[ i + 7 ], vertices[ i + 8 ] );

						if ( rayLocal.intersectTriangle( triangle, this.backfaceCulling, intersectionPoint ) !== null ) {

							if ( closest ) {

								const distance = intersectionPoint.squaredDistanceTo( rayLocal.origin );

								if ( distance < minDistance ) {

									minDistance = distance;

									closestIntersectionPoint.copy( intersectionPoint );
									closestTriangle.a.copy( triangle.a );
									closestTriangle.b.copy( triangle.b );
									closestTriangle.c.copy( triangle.c );
									found = true;

								}

							} else {

								found = true;
								break;

							}

						}

					}

				} else {

					// indexed geometry

					for ( let i = 0, l = indices.length; i < l; i += 3 ) {

						const a = indices[ i ];
						const b = indices[ i + 1 ];
						const c = indices[ i + 2 ];

						const stride = 3;

						triangle.a.set( vertices[ ( a * stride ) ], vertices[ ( a * stride ) + 1 ], vertices[ ( a * stride ) + 2 ] );
						triangle.b.set( vertices[ ( b * stride ) ], vertices[ ( b * stride ) + 1 ], vertices[ ( b * stride ) + 2 ] );
						triangle.c.set( vertices[ ( c * stride ) ], vertices[ ( c * stride ) + 1 ], vertices[ ( c * stride ) + 2 ] );

						if ( rayLocal.intersectTriangle( triangle, this.backfaceCulling, intersectionPoint ) !== null ) {

							if ( closest ) {

								const distance = intersectionPoint.squaredDistanceTo( rayLocal.origin );

								if ( distance < minDistance ) {

									minDistance = distance;

									closestIntersectionPoint.copy( intersectionPoint );
									closestTriangle.a.copy( triangle.a );
									closestTriangle.b.copy( triangle.b );
									closestTriangle.c.copy( triangle.c );
									found = true;

								}

							} else {

								found = true;
								break;

							}

						}

					}

				}

				// intersection was found

				if ( found ) {

					if ( closest ) {

						// restore closest intersection point and triangle

						intersectionPoint.copy( closestIntersectionPoint );
						triangle.a.copy( closestTriangle.a );
						triangle.b.copy( closestTriangle.b );
						triangle.c.copy( closestTriangle.c );

					}

					// transform intersection point back to world space

					intersectionPoint.applyMatrix4( worldMatrix );

					// compute normal of triangle in world space if necessary

					if ( normal !== null ) {

						plane.fromCoplanarPoints( triangle.a, triangle.b, triangle.c );
						normal.copy( plane.normal );
						normal.transformDirection( worldMatrix );

					}

					return intersectionPoint;

				}

			}

		}

		return null;

	}

	/**
	 * Returns a new geometry without containing indices.
	 *
	 * @return {MeshGeometry} The new geometry.
	 */
	toTriangleSoup() {

		const indices = this.indices;
		const vertices = this.vertices;
		let newVertices;

		if ( indices ) {

			newVertices = new Float32Array( indices.length * 3 );

			for ( let i = 0, l = indices.length; i < l; i ++ ) {

				const a = indices[ i ];
				const stride = 3;

				newVertices[ i * stride ] = vertices[ a * stride ];
				newVertices[ ( i * stride ) + 1 ] = vertices[ ( a * stride ) + 1 ];
				newVertices[ ( i * stride ) + 2 ] = vertices[ ( a * stride ) + 2 ];

			}

		} else {

			newVertices = new Float32Array( vertices );

		}

		return new MeshGeometry( newVertices );

	}

	/**
	* Transforms this instance into a JSON object.
	*
	* @return {Object} The JSON object.
	*/
	toJSON() {

		const json = {
			type: this.constructor.name
		};

		json.indices = {
			type: this.indices ? this.indices.constructor.name : 'null',
			data: this.indices ? Array.from( this.indices ) : null
		};

		json.vertices = Array.from( this.vertices );
		json.backfaceCulling = this.backfaceCulling;
		json.aabb = this.aabb.toJSON();
		json.boundingSphere = this.boundingSphere.toJSON();

		return json;

	}

	/**
	* Restores this instance from the given JSON object.
	*
	* @param {Object} json - The JSON object.
	* @return {MeshGeometry} A reference to this mesh geometry.
	*/
	fromJSON( json ) {

		this.aabb = new AABB().fromJSON( json.aabb );
		this.boundingSphere = new BoundingSphere().fromJSON( json.boundingSphere );
		this.backfaceCulling = json.backfaceCulling;

		this.vertices = new Float32Array( json.vertices );

		switch ( json.indices.type ) {

			case 'Uint16Array':
				this.indices = new Uint16Array( json.indices.data );
				break;

			case 'Uint32Array':
				this.indices = new Uint32Array( json.indices.data );
				break;

			case 'null':
				this.indices = null;
				break;

		}

		return this;

	}

}

/**
* Class for representing a timer.
*
* @author {@link https://github.com/Mugen87|Mugen87}
*/
class Time {

	/**
	* Constructs a new time object.
	*/
	constructor() {

		/**
		* The start time of this timer.
		* @type Number
		* @default 0
		*/
		this.startTime = 0;

		/**
		* The time stamp of the last simulation step.
		* @type Number
		* @default 0
		*/
		this.previousTime = 0;

		/**
		* The time stamp of the current simulation step.
		* @type Number
		*/
		this.currentTime = this.now();

		/**
		* Whether the Page Visibility API should be used to avoid large time
		* delta values produced via inactivity or not. This setting is
		* ignored if the browser does not support the API.
		* @type Boolean
		* @default true
		*/
		this.detectPageVisibility = true;

		//

		if ( typeof document !== 'undefined' && document.hidden !== undefined ) {

			this._pageVisibilityHandler = handleVisibilityChange.bind( this );

			document.addEventListener( 'visibilitychange', this._pageVisibilityHandler, false );

		}

	}

	/**
	* Returns the delta time in seconds for the current simulation step.
	*
	* @return {Number} The delta time in seconds.
	*/
	getDelta() {

		return ( this.currentTime - this.previousTime ) / 1000;

	}

	/**
	* Returns the elapsed time in seconds of this timer.
	*
	* @return {Number} The elapsed time in seconds.
	*/
	getElapsed() {

		return ( this.currentTime - this.startTime ) / 1000;

	}

	/**
	* Updates the internal state of this timer.
	*
	* @return {Time} A reference to this timer.
	*/
	update() {

		this.previousTime = this.currentTime;
		this.currentTime = this.now();

		return this;

	}

	/**
	* Returns a current time value in milliseconds.
	*
	* @return {Number} A current time value in milliseconds.
	*/
	now() {

		return ( typeof performance === 'undefined' ? Date : performance ).now();

	}

}

//

function handleVisibilityChange() {

	if ( this.detectPageVisibility === true && document.hidden === false ) {

		// reset the current time when the app was inactive (window minimized or tab switched)

		this.currentTime = this.now();

	}

}

/**
* Not all components of an AI system need to be updated in each simulation step.
* This class can be used to control the update process by defining how many updates
* should be executed per second.
*
* @author {@link https://github.com/Mugen87|Mugen87}
*/
class Regulator {

	/**
	* Constructs a new regulator.
	*
	* @param {Number} updateFrequency - The amount of updates per second.
	*/
	constructor( updateFrequency = 0 ) {

		/**
		* The amount of updates per second.
		* @type Number
		* @default 0
		*/
		this.updateFrequency = updateFrequency;

		this._time = new Time();
		this._nextUpdateTime = 0;

	}

	/**
	* Returns true if it is time to allow the next update.
	*
	* @return {Boolean} Whether an update is allowed or not.
	*/
	ready() {

		this._time.update();

		if ( this._time.currentTime >= this._nextUpdateTime ) {

			this._nextUpdateTime = this._time.currentTime + ( 1000 / this.updateFrequency );

			return true;

		}

		return false;

	}

}

/**
* Base class for representing a state in context of State-driven agent design.
*
* @author {@link https://github.com/Mugen87|Mugen87}
*/
class State {

	/**
	* This method is called once during a state transition when the {@link StateMachine} makes
	* this state active.
	*
	* @param {GameEntity} owner - The game entity that represents the execution context of this state.
	*/
	enter( /* owner */ ) {}

	/**
	* This method is called per simulation step if this state is active.
	*
	* @param {GameEntity} owner - The game entity that represents the execution context of this state.
	*/
	execute( /* owner */ ) {}

	/**
	* This method is called once during a state transition when the {@link StateMachine} makes
	* this state inactive.
	*
	* @param {GameEntity} owner - The game entity that represents the execution context of this state.
	*/
	exit( /* owner */ ) {}

	/**
	* Transforms this instance into a JSON object.
	*
	* @return {Object} The JSON object.
	*/
	toJSON() {}

	/**
	* Restores this instance from the given JSON object.
	*
	* @param {Object} json - The JSON object.
	* @return {State} A reference to this state.
	*/
	fromJSON( /* json */ ) {}

	/**
	* Restores UUIDs with references to GameEntity objects.
	*
	* @param {Map} entities - Maps game entities to UUIDs.
	* @return {State} A reference to this state.
	*/
	resolveReferences( /* entities */ ) {}

	/**
	* This method is called when messaging between game entities occurs.
	*
	* @param {GameEntity} owner - The game entity that represents the execution context of this state.
	* @param {Telegram} telegram - A data structure containing the actual message.
	* @return {Boolean} Whether the message was processed or not.
	*/
	onMessage( /* owner, telegram */ ) {

		return false;

	}

}

/**
* Finite state machine (FSM) for implementing State-driven agent design.
*
* @author {@link https://github.com/Mugen87|Mugen87}
*/
class StateMachine {

	/**
	* Constructs a new state machine with the given values.
	*
	* @param {GameEntity} owner - The owner of this state machine.
	*/
	constructor( owner = null ) {

		/**
		* The game entity that owns this state machine.
		* @type GameEntity
		*/
		this.owner = owner;

		/**
		* The current state of the game entity.
		* @type State
		*/
		this.currentState = null;

		/**
		* The previous state of the game entity.
		* @type State
		*/
		this.previousState = null; // a reference to the last state the agent was in

		/**
		* This state logic is called every time the state machine is updated.
		* @type State
		*/
		this.globalState = null;

		/**
		* A map with all states of the state machine.
		* @type Map
		*/
		this.states = new Map();

		//

		this._typesMap = new Map();

	}

	/**
	* Updates the internal state of the FSM. Usually called by {@link GameEntity#update}.
	*
	* @return {StateMachine} A reference to this state machine.
	*/
	update() {

		if ( this.globalState !== null ) {

			this.globalState.execute( this.owner );

		}

		if ( this.currentState !== null ) {

			this.currentState.execute( this.owner );

		}

		return this;

	}

	/**
	* Adds a new state with the given ID to the state machine.
	*
	* @param {String} id - The ID of the state.
	* @param {State} state - The state.
	* @return {StateMachine} A reference to this state machine.
	*/
	add( id, state ) {

		if ( state instanceof State ) {

			this.states.set( id, state );

		} else {

			Logger.warn( 'YUKA.StateMachine: .add() needs a parameter of type "YUKA.State".' );

		}

		return this;

	}

	/**
	* Removes a state via its ID from the state machine.
	*
	* @param {String} id - The ID of the state.
	* @return {StateMachine} A reference to this state machine.
	*/
	remove( id ) {

		this.states.delete( id );

		return this;

	}

	/**
	* Returns the state for the given ID.
	*
	* @param {String} id - The ID of the state.
	* @return {State} The state for the given ID.
	*/
	get( id ) {

		return this.states.get( id );

	}

	/**
	* Performs a state change to the state defined by its ID.
	*
	* @param {String} id - The ID of the state.
	* @return {StateMachine} A reference to this state machine.
	*/
	changeTo( id ) {

		const state = this.get( id );

		this._change( state );

		return this;

	}

	/**
	* Returns to the previous state.
	*
	* @return {StateMachine} A reference to this state machine.
	*/
	revert() {

		this._change( this.previousState );

		return this;

	}

	/**
	* Returns true if this FSM is in the given state.
	*
	* @return {Boolean} Whether this FSM is in the given state or not.
	*/
	in( id ) {

		const state = this.get( id );

		return ( state === this.currentState );

	}

	/**
	* Tries to dispatch the massage to the current or global state and returns true
	* if the message was processed successfully.
	*
	* @param {Telegram} telegram - The telegram with the message data.
	* @return {Boolean} Whether the message was processed or not.
	*/
	handleMessage( telegram ) {

		// first see, if the current state is valid and that it can handle the message

		if ( this.currentState !== null && this.currentState.onMessage( this.owner, telegram ) === true ) {

			return true;

		}

		// if not, and if a global state has been implemented, send the message to the global state

		if ( this.globalState !== null && this.globalState.onMessage( this.owner, telegram ) === true ) {

			return true;

		}

		return false;

	}

	/**
	* Transforms this instance into a JSON object.
	*
	* @return {Object} The JSON object.
	*/
	toJSON() {

		const json = {
			owner: this.owner.uuid,
			currentState: null,
			previousState: null,
			globalState: null,
			states: new Array()
		};

		const statesMap = new Map();

		// states

		for ( let [ id, state ] of this.states ) {

			json.states.push( {
				type: state.constructor.name,
				id: id,
				state: state.toJSON()
			} );

			statesMap.set( state, id );

		}

		json.currentState = statesMap.get( this.currentState ) || null;
		json.previousState = statesMap.get( this.previousState ) || null;
		json.globalState = statesMap.get( this.globalState ) || null;

		return json;

	}

	/**
	* Restores this instance from the given JSON object.
	*
	* @param {Object} json - The JSON object.
	* @return {StateMachine} A reference to this state machine.
	*/
	fromJSON( json ) {

		this.owner = json.owner;

		//

		const statesJSON = json.states;

		for ( let i = 0, l = statesJSON.length; i < l; i ++ ) {

			const stateJSON = statesJSON[ i ];
			const type = stateJSON.type;

			const ctor = this._typesMap.get( type );

			if ( ctor !== undefined ) {

				const id = stateJSON.id;
				const state = new ctor().fromJSON( stateJSON.state );

				this.add( id, state );

			} else {

				Logger.warn( 'YUKA.StateMachine: Unsupported state type:', type );
				continue;

			}

		}

		//

		this.currentState = ( json.currentState !== null ) ? ( this.get( json.currentState ) || null ) : null;
		this.previousState = ( json.previousState !== null ) ? ( this.get( json.previousState ) || null ) : null;
		this.globalState = ( json.globalState !== null ) ? ( this.get( json.globalState ) || null ) : null;

		return this;

	}

	/**
	* Restores UUIDs with references to GameEntity objects.
	*
	* @param {Map} entities - Maps game entities to UUIDs.
	* @return {StateMachine} A reference to this state machine.
	*/
	resolveReferences( entities ) {

		this.owner = entities.get( this.owner ) || null;

		for ( let state of this.states.values() ) {

			state.resolveReferences( entities );

		}

		return this;

	}

	/**
	* Registers a custom type for deserialization. When calling {@link StateMachine#fromJSON}
	* the state machine is able to pick the correct constructor in order to create custom states.
	*
	* @param {String} type - The name of the state type.
	* @param {Function} constructor - The constructor function.
	* @return {StateMachine} A reference to this state machine.
	*/
	registerType( type, constructor ) {

		this._typesMap.set( type, constructor );

		return this;

	}

	//

	_change( state ) {

		this.previousState = this.currentState;

		this.currentState.exit( this.owner );

		this.currentState = state;

		this.currentState.enter( this.owner );

	}

}

/**
* Base class for representing a term in a {@link FuzzyRule}.
*
* @author {@link https://github.com/Mugen87|Mugen87}
*/
class FuzzyTerm {

	/**
	* Clears the degree of membership value.
	*
	* @return {FuzzyTerm} A reference to this term.
	*/
	clearDegreeOfMembership() {}

	/**
	* Returns the degree of membership.
	*
	* @return {Number} Degree of membership.
	*/
	getDegreeOfMembership() {}

	/**
	* Updates the degree of membership by the given value. This method is used when
	* the term is part of a fuzzy rule's consequent.
	*
	* @param {Number} value - The value used to update the degree of membership.
	* @return {FuzzyTerm} A reference to this term.
	*/
	updateDegreeOfMembership( /* value */ ) {}

	/**
	* Transforms this instance into a JSON object.
	*
	* @return {Object} The JSON object.
	*/
	toJSON() {

		return {
			type: this.constructor.name
		};

	}

}

/**
* Base class for representing more complex fuzzy terms based on the
* composite design pattern.
*
* @author {@link https://github.com/Mugen87|Mugen87}
* @augments FuzzyTerm
*/
class FuzzyCompositeTerm extends FuzzyTerm {

	/**
	* Constructs a new fuzzy composite term with the given values.
	*
	* @param {Array} terms - An arbitrary amount of fuzzy terms.
	*/
	constructor( terms = new Array() ) {

		super();

		/**
		* List of fuzzy terms.
		* @type Array
		*/
		this.terms = terms;

	}

	/**
	* Clears the degree of membership value.
	*
	* @return {FuzzyCompositeTerm} A reference to this term.
	*/
	clearDegreeOfMembership() {

		const terms = this.terms;

		for ( let i = 0, l = terms.length; i < l; i ++ ) {

			terms[ i ].clearDegreeOfMembership();

		}

		return this;

	}

	/**
	* Updates the degree of membership by the given value. This method is used when
	* the term is part of a fuzzy rule's consequent.
	*
	* @param {Number} value - The value used to update the degree of membership.
	* @return {FuzzyCompositeTerm} A reference to this term.
	*/
	updateDegreeOfMembership( value ) {

		const terms = this.terms;

		for ( let i = 0, l = terms.length; i < l; i ++ ) {

			terms[ i ].updateDegreeOfMembership( value );

		}

		return this;

	}

	/**
	* Transforms this instance into a JSON object.
	*
	* @return {Object} The JSON object.
	*/
	toJSON() {

		const json = super.toJSON();

		json.terms = new Array();

		for ( let i = 0, l = this.terms.length; i < l; i ++ ) {

			const term = this.terms[ i ];

			if ( term instanceof FuzzyCompositeTerm ) {

				json.terms.push( term.toJSON() );

			} else {

				json.terms.push( term.uuid );

			}

		}

		return json;

	}

}

/**
* Class for representing an AND operator. Can be used to construct
* fuzzy rules.
*
* @author {@link https://github.com/Mugen87|Mugen87}
* @augments FuzzyCompositeTerm
*/
class FuzzyAND extends FuzzyCompositeTerm {

	/**
	* Constructs a new fuzzy AND operator with the given values. The constructor
	* accepts and arbitrary amount of fuzzy terms.
	*/
	constructor() {

		const terms = Array.from( arguments );

		super( terms );

	}

	/**
	* Returns the degree of membership. The AND operator returns the minimum
	* degree of membership of the sets it is operating on.
	*
	* @return {Number} Degree of membership.
	*/
	getDegreeOfMembership() {

		const terms = this.terms;
		let minDOM = Infinity;

		for ( let i = 0, l = terms.length; i < l; i ++ ) {

			const term = terms[ i ];
			const currentDOM = term.getDegreeOfMembership();

			if ( currentDOM < minDOM ) minDOM = currentDOM;

		}

		return minDOM;

	}

}

/**
* Hedges are special unary operators that can be employed to modify the meaning
* of a fuzzy set. The FAIRLY fuzzy hedge widens the membership function.
*
* @author {@link https://github.com/Mugen87|Mugen87}
* @augments FuzzyCompositeTerm
*/
class FuzzyFAIRLY extends FuzzyCompositeTerm {

	/**
	* Constructs a new fuzzy FAIRLY hedge with the given values.
	*
	* @param {FuzzyTerm} fuzzyTerm - The fuzzy term this hedge is working on.
	*/
	constructor( fuzzyTerm = null ) {

		const terms = ( fuzzyTerm !== null ) ? [ fuzzyTerm ] : new Array();

		super( terms );

	}

	// FuzzyTerm API

	/**
	* Clears the degree of membership value.
	*
	* @return {FuzzyFAIRLY} A reference to this fuzzy hedge.
	*/
	clearDegreeOfMembership() {

		const fuzzyTerm = this.terms[ 0 ];
		fuzzyTerm.clearDegreeOfMembership();

		return this;

	}

	/**
	* Returns the degree of membership.
	*
	* @return {Number} Degree of membership.
	*/
	getDegreeOfMembership() {

		const fuzzyTerm = this.terms[ 0 ];
		const dom = fuzzyTerm.getDegreeOfMembership();

		return Math.sqrt( dom );

	}

	/**
	* Updates the degree of membership by the given value.
	*
	* @return {FuzzyFAIRLY} A reference to this fuzzy hedge.
	*/
	updateDegreeOfMembership( value ) {

		const fuzzyTerm = this.terms[ 0 ];
		fuzzyTerm.updateDegreeOfMembership( Math.sqrt( value ) );

		return this;

	}

}

/**
* Class for representing an OR operator. Can be used to construct
* fuzzy rules.
*
* @author {@link https://github.com/Mugen87|Mugen87}
* @augments FuzzyCompositeTerm
*/
class FuzzyOR extends FuzzyCompositeTerm {

	/**
	* Constructs a new fuzzy AND operator with the given values. The constructor
	* accepts and arbitrary amount of fuzzy terms.
	*/
	constructor() {

		const terms = Array.from( arguments );

		super( terms );

	}

	/**
	* Returns the degree of membership. The AND operator returns the maximum
	* degree of membership of the sets it is operating on.
	*
	* @return {Number} Degree of membership.
	*/
	getDegreeOfMembership() {

		const terms = this.terms;
		let maxDOM = - Infinity;

		for ( let i = 0, l = terms.length; i < l; i ++ ) {

			const term = terms[ i ];
			const currentDOM = term.getDegreeOfMembership();

			if ( currentDOM > maxDOM ) maxDOM = currentDOM;

		}

		return maxDOM;

	}

}

/**
* Hedges are special unary operators that can be employed to modify the meaning
* of a fuzzy set. The FAIRLY fuzzy hedge widens the membership function.
*
* @author {@link https://github.com/Mugen87|Mugen87}
* @augments FuzzyCompositeTerm
*/
class FuzzyVERY extends FuzzyCompositeTerm {

	/**
	* Constructs a new fuzzy VERY hedge with the given values.
	*
	* @param {FuzzyTerm} fuzzyTerm - The fuzzy term this hedge is working on.
	*/
	constructor( fuzzyTerm = null ) {

		const terms = ( fuzzyTerm !== null ) ? [ fuzzyTerm ] : new Array();

		super( terms );

	}

	// FuzzyTerm API

	/**
	* Clears the degree of membership value.
	*
	* @return {FuzzyVERY} A reference to this fuzzy hedge.
	*/
	clearDegreeOfMembership() {

		const fuzzyTerm = this.terms[ 0 ];
		fuzzyTerm.clearDegreeOfMembership();

		return this;

	}

	/**
	* Returns the degree of membership.
	*
	* @return {Number} Degree of membership.
	*/
	getDegreeOfMembership() {

		const fuzzyTerm = this.terms[ 0 ];
		const dom = fuzzyTerm.getDegreeOfMembership();

		return dom * dom;

	}

	/**
	* Updates the degree of membership by the given value.
	*
	* @return {FuzzyVERY} A reference to this fuzzy hedge.
	*/
	updateDegreeOfMembership( value ) {

		const fuzzyTerm = this.terms[ 0 ];
		fuzzyTerm.updateDegreeOfMembership( value * value );

		return this;

	}

}

/**
* Base class for fuzzy sets. This type of sets are defined by a membership function
* which can be any arbitrary shape but are typically triangular or trapezoidal. They define
* a gradual transition from regions completely outside the set to regions completely
* within the set, thereby enabling a value to have partial membership to a set.
*
* This class is derived from {@link FuzzyTerm} so it can be directly used in fuzzy rules.
* According to the composite design pattern, a fuzzy set can be considered as an atomic fuzzy term.
*
* @author {@link https://github.com/Mugen87|Mugen87}
* @augments FuzzyTerm
*/
class FuzzySet extends FuzzyTerm {

	/**
	* Constructs a new fuzzy set with the given values.
	*
	* @param {Number} representativeValue - The maximum of the set's membership function.
	*/
	constructor( representativeValue = 0 ) {

		super();

		/**
		* Represents the degree of membership to this fuzzy set.
		* @type Number
		* @default 0
		*/
		this.degreeOfMembership = 0;

		/**
		* The maximum of the set's membership function. For instance, if
		* the set is triangular then this will be the peak point of the triangular.
		* If the set has a plateau then this value will be the mid point of the
		* plateau. Used to avoid runtime calculations.
		* @type Number
		* @default 0
		*/
		this.representativeValue = representativeValue;

		/**
		* Represents the left border of this fuzzy set.
		* @type Number
		* @default 0
		*/
		this.left = 0;

		/**
		* Represents the right border of this fuzzy set.
		* @type Number
		* @default 0
		*/
		this.right = 0;

		//

		this._uuid = null;

	}

	get uuid() {

		if ( this._uuid === null ) {

			this._uuid = MathUtils.generateUUID();

		}

		return this._uuid;

	}

	set uuid( uuid ) {

		this._uuid = uuid;

	}

	/**
	* Computes the degree of membership for the given value. Notice that this method
	* does not set {@link FuzzySet#degreeOfMembership} since other classes use it in
	* order to calculate intermediate degree of membership values. This method be
	* implemented by all concrete fuzzy set classes.
	*
	* @param {Number} value - The value used to calculate the degree of membership.
	* @return {Number} The degree of membership.
	*/
	computeDegreeOfMembership( /* value */ ) {}

	// FuzzyTerm API

	/**
	* Clears the degree of membership value.
	*
	* @return {FuzzySet} A reference to this fuzzy set.
	*/
	clearDegreeOfMembership() {

		this.degreeOfMembership = 0;

		return this;

	}

	/**
	* Returns the degree of membership.
	*
	* @return {Number} Degree of membership.
	*/
	getDegreeOfMembership() {

		return this.degreeOfMembership;

	}

	/**
	* Updates the degree of membership by the given value. This method is used when
	* the set is part of a fuzzy rule's consequent.
	*
	* @return {FuzzySet} A reference to this fuzzy set.
	*/
	updateDegreeOfMembership( value ) {

		// update the degree of membership if the given value is greater than the
		// existing one

		if ( value > this.degreeOfMembership ) this.degreeOfMembership = value;

		return this;

	}

	/**
	* Transforms this instance into a JSON object.
	*
	* @return {Object} The JSON object.
	*/
	toJSON() {

		const json = super.toJSON();

		json.degreeOfMembership = this.degreeOfMembership;
		json.representativeValue = this.representativeValue;
		json.left = this.left;
		json.right = this.right;
		json.uuid = this.uuid;

		return json;

	}

	/**
	* Restores this instance from the given JSON object.
	*
	* @param {Object} json - The JSON object.
	* @return {FuzzySet} A reference to this fuzzy set.
	*/
	fromJSON( json ) {

		this.degreeOfMembership = json.degreeOfMembership;
		this.representativeValue = json.representativeValue;
		this.left = json.left;
		this.right = json.right;
		this.uuid = json.uuid;

		return this;

	}

}

/**
* Class for representing a fuzzy set that has a s-shape membership function with
* values from highest to lowest.
*
* @author {@link https://github.com/robp94|robp94}
* @augments FuzzySet
*/
class LeftSCurveFuzzySet extends FuzzySet {

	/**
	* Constructs a new S-curve fuzzy set with the given values.
	*
	* @param {Number} left - Represents the left border of this fuzzy set.
	* @param {Number} midpoint - Represents the peak value of this fuzzy set.
	* @param {Number} right - Represents the right border of this fuzzy set.
	*/
	constructor( left = 0, midpoint = 0, right = 0 ) {

		// the representative value is the midpoint of the plateau of the shoulder

		const representativeValue = ( midpoint + left ) / 2;

		super( representativeValue );

		/**
		* Represents the left border of this fuzzy set.
		* @type Number
		* @default 0
		*/
		this.left = left;

		/**
		* Represents the peak value of this fuzzy set.
		* @type Number
		* @default 0
		*/
		this.midpoint = midpoint;

		/**
		* Represents the right border of this fuzzy set.
		* @type Number
		* @default 0
		*/
		this.right = right;

	}

	/**
	* Computes the degree of membership for the given value.
	*
	* @param {Number} value - The value used to calculate the degree of membership.
	* @return {Number} The degree of membership.
	*/
	computeDegreeOfMembership( value ) {

		const midpoint = this.midpoint;
		const left = this.left;
		const right = this.right;

		// find DOM if the given value is left of the center or equal to the center

		if ( ( value >= left ) && ( value <= midpoint ) ) {

			return 1;

		}

		// find DOM if the given value is right of the midpoint

		if ( ( value > midpoint ) && ( value <= right ) ) {

			if ( value >= ( ( midpoint + right ) / 2 ) ) {

				return 2 * ( Math.pow( ( value - right ) / ( midpoint - right ), 2 ) );

			} else { //todo test

				return 1 - ( 2 * ( Math.pow( ( value - midpoint ) / ( midpoint - right ), 2 ) ) );

			}

		}

		// out of range

		return 0;

	}

	/**
	* Transforms this instance into a JSON object.
	*
	* @return {Object} The JSON object.
	*/
	toJSON() {

		const json = super.toJSON();

		json.midpoint = this.midpoint;

		return json;

	}

	/**
	* Restores this instance from the given JSON object.
	*
	* @param {Object} json - The JSON object.
	* @return {LeftSCurveFuzzySet} A reference to this fuzzy set.
	*/
	fromJSON( json ) {

		super.fromJSON( json );

		this.midpoint = json.midpoint;

		return this;

	}

}

/**
* Class for representing a fuzzy set that has a left shoulder shape. The range between
* the midpoint and left border point represents the same DOM.
*
* @author {@link https://github.com/Mugen87|Mugen87}
* @augments FuzzySet
*/
class LeftShoulderFuzzySet extends FuzzySet {

	/**
	* Constructs a new left shoulder fuzzy set with the given values.
	*
	* @param {Number} left - Represents the left border of this fuzzy set.
	* @param {Number} midpoint - Represents the peak value of this fuzzy set.
	* @param {Number} right - Represents the right border of this fuzzy set.
	*/
	constructor( left = 0, midpoint = 0, right = 0 ) {

		// the representative value is the midpoint of the plateau of the shoulder

		const representativeValue = ( midpoint + left ) / 2;

		super( representativeValue );

		/**
		* Represents the left border of this fuzzy set.
		* @type Number
		* @default 0
		*/
		this.left = left;

		/**
		* Represents the peak value of this fuzzy set.
		* @type Number
		* @default 0
		*/
		this.midpoint = midpoint;

		/**
		* Represents the right border of this fuzzy set.
		* @type Number
		* @default 0
		*/
		this.right = right;

	}

	/**
	* Computes the degree of membership for the given value.
	*
	* @param {Number} value - The value used to calculate the degree of membership.
	* @return {Number} The degree of membership.
	*/
	computeDegreeOfMembership( value ) {

		const midpoint = this.midpoint;
		const left = this.left;
		const right = this.right;

		// find DOM if the given value is left of the center or equal to the center

		if ( ( value >= left ) && ( value <= midpoint ) ) {

			return 1;

		}

		// find DOM if the given value is right of the midpoint

		if ( ( value > midpoint ) && ( value <= right ) ) {

			const grad = 1 / ( right - midpoint );

			return grad * ( right - value );

		}

		// out of range

		return 0;

	}

	/**
	* Transforms this instance into a JSON object.
	*
	* @return {Object} The JSON object.
	*/
	toJSON() {

		const json = super.toJSON();

		json.midpoint = this.midpoint;

		return json;

	}

	/**
	* Restores this instance from the given JSON object.
	*
	* @param {Object} json - The JSON object.
	* @return {LeftShoulderFuzzySet} A reference to this fuzzy set.
	*/
	fromJSON( json ) {

		super.fromJSON( json );

		this.midpoint = json.midpoint;

		return this;

	}

}

/**
* Class for representing a fuzzy set that has a normal distribution shape. It can be defined
* by the mean and standard deviation.
*
* @author {@link https://github.com/robp94|robp94}
* @augments FuzzySet
*/
class NormalDistFuzzySet extends FuzzySet {

	/**
	* Constructs a new triangular fuzzy set with the given values.
	*
	* @param {Number} left - Represents the left border of this fuzzy set.
	* @param {Number} midpoint - Mean or expectation of the normal distribution.
	* @param {Number} right - Represents the right border of this fuzzy set.
	* @param {Number} standardDeviation - Standard deviation of the normal distribution.
	*/
	constructor( left = 0, midpoint = 0, right = 0, standardDeviation = 0 ) {

		super( midpoint );

		/**
		* Represents the left border of this fuzzy set.
		* @type Number
		* @default 0
		*/
		this.left = left;

		/**
		* Represents the peak value of this fuzzy set.
		* @type Number
		* @default 0
		*/
		this.midpoint = midpoint;

		/**
		* Represents the right border of this fuzzy set.
		* @type Number
		* @default 0
		*/
		this.right = right;

		/**
		* Represents the standard deviation of this fuzzy set.
		* @type Number
		* @default 0
		*/
		this.standardDeviation = standardDeviation;

		//

		this._cache = {};

	}

	/**
	* Computes the degree of membership for the given value.
	*
	* @param {Number} value - The value used to calculate the degree of membership.
	* @return {Number} The degree of membership.
	*/
	computeDegreeOfMembership( value ) {

		this._updateCache();

		if ( value >= this.right || value <= this.left ) return 0;

		return probabilityDensity( value, this.midpoint, this._cache.variance ) / this._cache.normalizationFactor;

	}

	/**
	* Transforms this instance into a JSON object.
	*
	* @return {Object} The JSON object.
	*/
	toJSON() {

		const json = super.toJSON();

		json.midpoint = this.midpoint;
		json.standardDeviation = this.standardDeviation;

		return json;

	}

	/**
	* Restores this instance from the given JSON object.
	*
	* @param {Object} json - The JSON object.
	* @return {NormalDistFuzzySet} A reference to this fuzzy set.
	*/
	fromJSON( json ) {

		super.fromJSON( json );

		this.midpoint = json.midpoint;
		this.standardDeviation = json.standardDeviation;

		return this;

	}

	//

	_updateCache() {

		const cache =	this._cache;
		const midpoint = this.midpoint;
		const standardDeviation = this.standardDeviation;

		if ( midpoint !== cache.midpoint || standardDeviation !== cache.standardDeviation ) {

			const variance = standardDeviation * standardDeviation;

			cache.midpoint = midpoint;
			cache.standardDeviation = standardDeviation;
			cache.variance = variance;

			// this value is used to ensure the DOM lies in the range of [0,1]

			cache.normalizationFactor = probabilityDensity( midpoint, midpoint, variance );

		}

		return this;

	}

}

//

function probabilityDensity( x, mean, variance ) {

	return ( 1 / Math.sqrt( 2 * Math.PI * variance ) ) * Math.exp( - ( Math.pow( ( x - mean ), 2 ) ) / ( 2 * variance ) );

}

/**
* Class for representing a fuzzy set that has a s-shape membership function with
* values from lowest to highest.
*
* @author {@link https://github.com/robp94|robp94}
* @augments FuzzySet
*/
class RightSCurveFuzzySet extends FuzzySet {

	/**
	* Constructs a new S-curve fuzzy set with the given values.
	*
	* @param {Number} left - Represents the left border of this fuzzy set.
	* @param {Number} midpoint - Represents the peak value of this fuzzy set.
	* @param {Number} right - Represents the right border of this fuzzy set.
	*/
	constructor( left = 0, midpoint = 0, right = 0 ) {

		// the representative value is the midpoint of the plateau of the shoulder

		const representativeValue = ( midpoint + right ) / 2;

		super( representativeValue );

		/**
		* Represents the left border of this fuzzy set.
		* @type Number
		* @default 0
		*/
		this.left = left;

		/**
		* Represents the peak value of this fuzzy set.
		* @type Number
		* @default 0
		*/
		this.midpoint = midpoint;

		/**
		* Represents the right border of this fuzzy set.
		* @type Number
		* @default 0
		*/
		this.right = right;

	}

	/**
	* Computes the degree of membership for the given value.
	*
	* @param {Number} value - The value used to calculate the degree of membership.
	* @return {Number} The degree of membership.
	*/
	computeDegreeOfMembership( value ) {

		const midpoint = this.midpoint;
		const left = this.left;
		const right = this.right;

		// find DOM if the given value is left of the center or equal to the center

		if ( ( value >= left ) && ( value <= midpoint ) ) {

			if ( value <= ( ( left + midpoint ) / 2 ) ) {

				return 2 * ( Math.pow( ( value - left ) / ( midpoint - left ), 2 ) );

			} else {

				return 1 - ( 2 * ( Math.pow( ( value - midpoint ) / ( midpoint - left ), 2 ) ) );

			}


		}

		// find DOM if the given value is right of the midpoint

		if ( ( value > midpoint ) && ( value <= right ) ) {

			return 1;

		}

		// out of range

		return 0;

	}

	/**
	* Transforms this instance into a JSON object.
	*
	* @return {Object} The JSON object.
	*/
	toJSON() {

		const json = super.toJSON();

		json.midpoint = this.midpoint;

		return json;

	}

	/**
	* Restores this instance from the given JSON object.
	*
	* @param {Object} json - The JSON object.
	* @return {RightSCurveFuzzySet} A reference to this fuzzy set.
	*/
	fromJSON( json ) {

		super.fromJSON( json );

		this.midpoint = json.midpoint;

		return this;

	}

}

/**
* Class for representing a fuzzy set that has a right shoulder shape. The range between
* the midpoint and right border point represents the same DOM.
*
* @author {@link https://github.com/Mugen87|Mugen87}
* @augments FuzzySet
*/
class RightShoulderFuzzySet extends FuzzySet {

	/**
	* Constructs a new right shoulder fuzzy set with the given values.
	*
	* @param {Number} left - Represents the left border of this fuzzy set.
	* @param {Number} midpoint - Represents the peak value of this fuzzy set.
	* @param {Number} right - Represents the right border of this fuzzy set.
	*/
	constructor( left = 0, midpoint = 0, right = 0 ) {

		// the representative value is the midpoint of the plateau of the shoulder

		const representativeValue = ( midpoint + right ) / 2;

		super( representativeValue );

		/**
		* Represents the left border of this fuzzy set.
		* @type Number
		* @default 0
		*/
		this.left = left;

		/**
		* Represents the peak value of this fuzzy set.
		* @type Number
		* @default 0
		*/
		this.midpoint = midpoint;

		/**
		* Represents the right border of this fuzzy set.
		* @type Number
		* @default 0
		*/
		this.right = right;

	}

	/**
	* Computes the degree of membership for the given value.
	*
	* @param {Number} value - The value used to calculate the degree of membership.
	* @return {Number} The degree of membership.
	*/
	computeDegreeOfMembership( value ) {

		const midpoint = this.midpoint;
		const left = this.left;
		const right = this.right;

		// find DOM if the given value is left of the center or equal to the center

		if ( ( value >= left ) && ( value <= midpoint ) ) {

			const grad = 1 / ( midpoint - left );

			return grad * ( value - left );

		}

		// find DOM if the given value is right of the midpoint

		if ( ( value > midpoint ) && ( value <= right ) ) {

			return 1;

		}

		// out of range

		return 0;

	}

	/**
	* Transforms this instance into a JSON object.
	*
	* @return {Object} The JSON object.
	*/
	toJSON() {

		const json = super.toJSON();

		json.midpoint = this.midpoint;

		return json;

	}

	/**
	* Restores this instance from the given JSON object.
	*
	* @param {Object} json - The JSON object.
	* @return {RightShoulderFuzzySet} A reference to this fuzzy set.
	*/
	fromJSON( json ) {

		super.fromJSON( json );

		this.midpoint = json.midpoint;

		return this;

	}

}

/**
* Class for representing a fuzzy set that is a singleton. In its range, the degree of
* membership is always one.
*
* @author {@link https://github.com/Mugen87|Mugen87}
* @augments FuzzySet
*/
class SingletonFuzzySet extends FuzzySet {

	/**
	* Constructs a new singleton fuzzy set with the given values.
	*
	* @param {Number} left - Represents the left border of this fuzzy set.
	* @param {Number} midpoint - Represents the peak value of this fuzzy set.
	* @param {Number} right - Represents the right border of this fuzzy set.
	*/
	constructor( left = 0, midpoint = 0, right = 0 ) {

		super( midpoint );

		/**
		* Represents the left border of this fuzzy set.
		* @type Number
		* @default 0
		*/
		this.left = left;

		/**
		* Represents the peak value of this fuzzy set.
		* @type Number
		* @default 0
		*/
		this.midpoint = midpoint;

		/**
		* Represents the right border of this fuzzy set.
		* @type Number
		* @default 0
		*/
		this.right = right;

	}

	/**
	* Computes the degree of membership for the given value.
	*
	* @param {Number} value - The value used to calculate the degree of membership.
	* @return {Number} The degree of membership.
	*/
	computeDegreeOfMembership( value ) {

		const left = this.left;
		const right = this.right;

		return ( value >= left && value <= right ) ? 1 : 0;

	}

	/**
	* Transforms this instance into a JSON object.
	*
	* @return {Object} The JSON object.
	*/
	toJSON() {

		const json = super.toJSON();

		json.midpoint = this.midpoint;

		return json;

	}

	/**
	* Restores this instance from the given JSON object.
	*
	* @param {Object} json - The JSON object.
	* @return {SingletonFuzzySet} A reference to this fuzzy set.
	*/
	fromJSON( json ) {

		super.fromJSON( json );

		this.midpoint = json.midpoint;

		return this;

	}

}

/**
* Class for representing a fuzzy set that has a triangular shape. It can be defined
* by a left point, a midpoint (peak) and a right point.
*
* @author {@link https://github.com/Mugen87|Mugen87}
* @augments FuzzySet
*/
class TriangularFuzzySet extends FuzzySet {

	/**
	* Constructs a new triangular fuzzy set with the given values.
	*
	* @param {Number} left - Represents the left border of this fuzzy set.
	* @param {Number} midpoint - Represents the peak value of this fuzzy set.
	* @param {Number} right - Represents the right border of this fuzzy set.
	*/
	constructor( left = 0, midpoint = 0, right = 0 ) {

		super( midpoint );

		/**
		* Represents the left border of this fuzzy set.
		* @type Number
		* @default 0
		*/
		this.left = left;

		/**
		* Represents the peak value of this fuzzy set.
		* @type Number
		* @default 0
		*/
		this.midpoint = midpoint;

		/**
		* Represents the right border of this fuzzy set.
		* @type Number
		* @default 0
		*/
		this.right = right;

	}

	/**
	* Computes the degree of membership for the given value.
	*
	* @param {Number} value - The value used to calculate the degree of membership.
	* @return {Number} The degree of membership.
	*/
	computeDegreeOfMembership( value ) {

		const midpoint = this.midpoint;
		const left = this.left;
		const right = this.right;

		// find DOM if the given value is left of the center or equal to the center

		if ( ( value >= left ) && ( value <= midpoint ) ) {

			const grad = 1 / ( midpoint - left );

			return grad * ( value - left );

		}

		// find DOM if the given value is right of the center

		if ( ( value > midpoint ) && ( value <= right ) ) {

			const grad = 1 / ( right - midpoint );

			return grad * ( right - value );

		}

		// out of range

		return 0;

	}

	/**
	* Transforms this instance into a JSON object.
	*
	* @return {Object} The JSON object.
	*/
	toJSON() {

		const json = super.toJSON();

		json.midpoint = this.midpoint;

		return json;

	}

	/**
	* Restores this instance from the given JSON object.
	*
	* @param {Object} json - The JSON object.
	* @return {TriangularFuzzySet} A reference to this fuzzy set.
	*/
	fromJSON( json ) {

		super.fromJSON( json );

		this.midpoint = json.midpoint;

		return this;

	}

}

/**
* Class for representing a fuzzy rule. Fuzzy rules are comprised of an antecedent and
* a consequent in the form: IF antecedent THEN consequent.
*
* Compared to ordinary if/else statements with discrete values, the consequent term
* of a fuzzy rule can fire to a matter of degree.
*
* @author {@link https://github.com/Mugen87|Mugen87}
*/
class FuzzyRule {

	/**
	* Constructs a new fuzzy rule with the given values.
	*
	* @param {FuzzyTerm} antecedent - Represents the condition of the rule.
	* @param {FuzzyTerm} consequence - Describes the consequence if the condition is satisfied.
	*/
	constructor( antecedent = null, consequence = null ) {

		/**
		* Represents the condition of the rule.
		* @type FuzzyTerm
		* @default null
		*/
		this.antecedent = antecedent;

		/**
		* Describes the consequence if the condition is satisfied.
		* @type FuzzyTerm
		* @default null
		*/
		this.consequence = consequence;

	}

	/**
	* Initializes the consequent term of this fuzzy rule.
	*
	* @return {FuzzyRule} A reference to this fuzzy rule.
	*/
	initConsequence() {

		this.consequence.clearDegreeOfMembership();

		return this;

	}

	/**
	* Evaluates the rule and updates the degree of membership of the consequent term with
	* the degree of membership of the antecedent term.
	*
	* @return {FuzzyRule} A reference to this fuzzy rule.
	*/
	evaluate() {

		this.consequence.updateDegreeOfMembership( this.antecedent.getDegreeOfMembership() );

		return this;

	}

	/**
	* Transforms this instance into a JSON object.
	*
	* @return {Object} The JSON object.
	*/
	toJSON() {

		const json = {};

		const antecedent = this.antecedent;
		const consequence = this.consequence;

		json.type = this.constructor.name;
		json.antecedent = ( antecedent instanceof FuzzyCompositeTerm ) ? antecedent.toJSON() : antecedent.uuid;
		json.consequence = ( consequence instanceof FuzzyCompositeTerm ) ? consequence.toJSON() : consequence.uuid;

		return json;

	}

	/**
	* Restores this instance from the given JSON object.
	*
	* @param {Object} json - The JSON object.
	* @param {Map} fuzzySets - Maps fuzzy sets to UUIDs.
	* @return {FuzzyRule} A reference to this fuzzy rule.
	*/
	fromJSON( json, fuzzySets ) {

		function parseTerm( termJSON ) {

			if ( typeof termJSON === 'string' ) {

				// atomic term -> FuzzySet

				const uuid = termJSON;
				return fuzzySets.get( uuid ) || null;

			} else {

				// composite term

				const type = termJSON.type;

				let term;

				switch ( type ) {

					case 'FuzzyAND':
						term = new FuzzyAND();
						break;

					case 'FuzzyOR':
						term = new FuzzyOR();
						break;

					case 'FuzzyVERY':
						term = new FuzzyVERY();
						break;

					case 'FuzzyFAIRLY':
						term = new FuzzyFAIRLY();
						break;

					default:
						Logger.error( 'YUKA.FuzzyRule: Unsupported operator type:', type );
						return;

				}

				const termsJSON = termJSON.terms;

				for ( let i = 0, l = termsJSON.length; i < l; i ++ ) {

					// recursively parse all subordinate terms

					term.terms.push( parseTerm( termsJSON[ i ] ) );

				}

				return term;

			}

		}

		this.antecedent = parseTerm( json.antecedent );
		this.consequence = parseTerm( json.consequence );

		return this;

	}

}

/**
* Class for representing a fuzzy linguistic variable (FLV). A FLV is the
* composition of one or more fuzzy sets to represent a concept or domain
* qualitatively. For example fuzzs sets "Dumb", "Average", and "Clever"
* are members of the fuzzy linguistic variable "IQ".
*
* @author {@link https://github.com/Mugen87|Mugen87}
*/
class FuzzyVariable {

	/**
	* Constructs a new fuzzy linguistic variable.
	*/
	constructor() {

		/**
		* An array of the fuzzy sets that comprise this FLV.
		* @type Array
		*/
		this.fuzzySets = new Array();

		/**
		* The minimum value range of this FLV. This value is
		* automatically updated when adding/removing fuzzy sets.
		* @type Number
		* @default Infinity
		*/
		this.minRange = Infinity;

		/**
		* The maximum value range of this FLV. This value is
		* automatically updated when adding/removing fuzzy sets.
		* @type Number
		* @default - Infinity
		*/
		this.maxRange = - Infinity;

	}

	/**
	* Adds the given fuzzy set to this FLV.
	*
	* @param {FuzzySet} fuzzySet - The fuzzy set to add.
	* @return {FuzzyVariable} A reference to this FLV.
	*/
	add( fuzzySet ) {

		this.fuzzySets.push( fuzzySet );

		// adjust range

		if ( fuzzySet.left < this.minRange ) this.minRange = fuzzySet.left;
		if ( fuzzySet.right > this.maxRange ) this.maxRange = fuzzySet.right;

		return this;

	}

	/**
	* Removes the given fuzzy set from this FLV.
	*
	* @param {FuzzySet} fuzzySet - The fuzzy set to remove.
	* @return {FuzzyVariable} A reference to this FLV.
	*/
	remove( fuzzySet ) {

		const fuzzySets = this.fuzzySets;

		const index = fuzzySets.indexOf( fuzzySet );
		fuzzySets.splice( index, 1 );

		// iterate over all fuzzy sets to recalculate the min/max range

		this.minRange = Infinity;
		this.maxRange = - Infinity;

		for ( let i = 0, l = fuzzySets.length; i < l; i ++ ) {

			const fuzzySet = fuzzySets[ i ];

			if ( fuzzySet.left < this.minRange ) this.minRange = fuzzySet.left;
			if ( fuzzySet.right > this.maxRange ) this.maxRange = fuzzySet.right;

		}

		return this;

	}

	/**
	* Fuzzifies a value by calculating its degree of membership in each of
	* this variable's fuzzy sets.
	*
	* @param {Number} value - The crips value to fuzzify.
	* @return {FuzzyVariable} A reference to this FLV.
	*/
	fuzzify( value ) {

		if ( value < this.minRange || value > this.maxRange ) {

			Logger.warn( 'YUKA.FuzzyVariable: Value for fuzzification out of range.' );
			return;

		}

		const fuzzySets = this.fuzzySets;

		for ( let i = 0, l = fuzzySets.length; i < l; i ++ ) {

			const fuzzySet = fuzzySets[ i ];

			fuzzySet.degreeOfMembership = fuzzySet.computeDegreeOfMembership( value );

		}

		return this;

	}

	/**
	* Defuzzifies the FLV using the "Average of Maxima" (MaxAv) method.
	*
	* @return {Number} The defuzzified, crips value.
	*/
	defuzzifyMaxAv() {

		// the average of maxima (MaxAv for short) defuzzification method scales the
		// representative value of each fuzzy set by its DOM and takes the average

		const fuzzySets = this.fuzzySets;

		let bottom = 0;
		let top = 0;

		for ( let i = 0, l = fuzzySets.length; i < l; i ++ ) {

			const fuzzySet = fuzzySets[ i ];

			bottom += fuzzySet.degreeOfMembership;
			top += fuzzySet.representativeValue * fuzzySet.degreeOfMembership;

		}

		return ( bottom === 0 ) ? 0 : ( top / bottom );

	}

	/**
	* Defuzzifies the FLV using the "Centroid" method.
	*
	* @param {Number} samples - The amount of samples used for defuzzification.
	* @return {Number} The defuzzified, crips value.
	*/
	defuzzifyCentroid( samples = 10 ) {

		const fuzzySets = this.fuzzySets;

		const stepSize = ( this.maxRange - this.minRange ) / samples;

		let totalArea = 0;
		let sumOfMoments = 0;

		for ( let s = 1; s <= samples; s ++ ) {

			const sample = this.minRange + ( s * stepSize );

			for ( let i = 0, l = fuzzySets.length; i < l; i ++ ) {

				const fuzzySet = fuzzySets[ i ];

				const contribution = Math.min( fuzzySet.degreeOfMembership, fuzzySet.computeDegreeOfMembership( sample ) );

				totalArea += contribution;

				sumOfMoments += ( sample * contribution );

			}

		}

		return ( totalArea === 0 ) ? 0 : ( sumOfMoments / totalArea );

	}

	/**
	* Transforms this instance into a JSON object.
	*
	* @return {Object} The JSON object.
	*/
	toJSON() {

		const json = {
			type: this.constructor.name,
			fuzzySets: new Array(),
			minRange: this.minRange.toString(),
			maxRange: this.maxRange.toString(),
		};

		for ( let i = 0, l = this.fuzzySets.length; i < l; i ++ ) {

			const fuzzySet = this.fuzzySets[ i ];
			json.fuzzySets.push( fuzzySet.toJSON() );

		}

		return json;

	}

	/**
	* Restores this instance from the given JSON object.
	*
	* @param {Object} json - The JSON object.
	* @return {FuzzyVariable} A reference to this fuzzy variable.
	*/
	fromJSON( json ) {

		this.minRange = parseFloat( json.minRange );
		this.maxRange = parseFloat( json.maxRange );

		for ( let i = 0, l = json.fuzzySets.length; i < l; i ++ ) {

			const fuzzySetJson = json.fuzzySets[ i ];

			let type = fuzzySetJson.type;

			switch ( type ) {

				case 'LeftShoulderFuzzySet':
					this.fuzzySets.push( new LeftShoulderFuzzySet().fromJSON( fuzzySetJson ) );
					break;

				case 'RightShoulderFuzzySet':
					this.fuzzySets.push( new RightShoulderFuzzySet().fromJSON( fuzzySetJson ) );
					break;

				case 'SingletonFuzzySet':
					this.fuzzySets.push( new SingletonFuzzySet().fromJSON( fuzzySetJson ) );
					break;

				case 'TriangularFuzzySet':
					this.fuzzySets.push( new TriangularFuzzySet().fromJSON( fuzzySetJson ) );
					break;

				default:
					Logger.error( 'YUKA.FuzzyVariable: Unsupported fuzzy set type:', fuzzySetJson.type );

			}

		}

		return this;

	}

}

/**
* Class for representing a fuzzy module. Instances of this class are used by
* game entities for fuzzy inference. A fuzzy module is a collection of fuzzy variables
* and the rules that operate on them.
*
* @author {@link https://github.com/Mugen87|Mugen87}
*/
class FuzzyModule {

	/**
	* Constructs a new fuzzy module.
	*/
	constructor() {

		/**
		* An array of the fuzzy rules.
		* @type Array
		*/
		this.rules = new Array();

		/**
		* A map of FLVs.
		* @type Map
		*/
		this.flvs = new Map();

	}

	/**
	* Adds the given FLV under the given name to this fuzzy module.
	*
	* @param {String} name - The name of the FLV.
	* @param {FuzzyVariable} flv - The FLV to add.
	* @return {FuzzyModule} A reference to this fuzzy module.
	*/
	addFLV( name, flv ) {

		this.flvs.set( name, flv );

		return this;

	}

	/**
	* Remove the FLV under the given name from this fuzzy module.
	*
	* @param {String} name - The name of the FLV to remove.
	* @return {FuzzyModule} A reference to this fuzzy module.
	*/
	removeFLV( name ) {

		this.flvs.delete( name );

		return this;

	}

	/**
	* Adds the given fuzzy rule to this fuzzy module.
	*
	* @param {FuzzyRule} rule - The fuzzy rule to add.
	* @return {FuzzyModule} A reference to this fuzzy module.
	*/
	addRule( rule ) {

		this.rules.push( rule );

		return this;

	}

	/**
	* Removes the given fuzzy rule from this fuzzy module.
	*
	* @param {FuzzyRule} rule - The fuzzy rule to remove.
	* @return {FuzzyModule} A reference to this fuzzy module.
	*/
	removeRule( rule ) {

		const rules = this.rules;

		const index = rules.indexOf( rule );
		rules.splice( index, 1 );

		return this;

	}

	/**
	* Calls the fuzzify method of the defined FLV with the given value.
	*
	* @param {String} name - The name of the FLV
	* @param {Number} value - The crips value to fuzzify.
	* @return {FuzzyModule} A reference to this fuzzy module.
	*/
	fuzzify( name, value ) {

		const flv = this.flvs.get( name );

		flv.fuzzify( value );

		return this;

	}

	/**
	* Given a fuzzy variable and a defuzzification method this returns a crisp value.
	*
	* @param {String} name - The name of the FLV
	* @param {String} type - The type of defuzzification.
	* @return {Number} The defuzzified, crips value.
	*/
	defuzzify( name, type = FuzzyModule.DEFUZ_TYPE.MAXAV ) {

		const flvs = this.flvs;
		const rules = this.rules;

		this._initConsequences();

		for ( let i = 0, l = rules.length; i < l; i ++ ) {

			const rule = rules[ i ];

			rule.evaluate();

		}

		const flv = flvs.get( name );

		let value;

		switch ( type ) {

			case FuzzyModule.DEFUZ_TYPE.MAXAV:
				value = flv.defuzzifyMaxAv();
				break;

			case FuzzyModule.DEFUZ_TYPE.CENTROID:
				value = flv.defuzzifyCentroid();
				break;

			default:
				Logger.warn( 'YUKA.FuzzyModule: Unknown defuzzification method:', type );
				value = flv.defuzzifyMaxAv(); // use MaxAv as fallback

		}

		return value;

	}

	_initConsequences() {

		const rules = this.rules;

		// initializes the consequences of all rules.

		for ( let i = 0, l = rules.length; i < l; i ++ ) {

			const rule = rules[ i ];

			rule.initConsequence();

		}

		return this;

	}

	/**
	* Transforms this instance into a JSON object.
	*
	* @return {Object} The JSON object.
	*/
	toJSON() {

		const json = {
			rules: new Array(),
			flvs: new Array()
		};

		// rules

		const rules = this.rules;

		for ( let i = 0, l = rules.length; i < l; i ++ ) {

			json.rules.push( rules[ i ].toJSON() );

		}

		// flvs

		const flvs = this.flvs;

		for ( let [ name, flv ] of flvs ) {

			json.flvs.push( { name: name, flv: flv.toJSON() } );

		}

		return json;

	}

	/**
	* Restores this instance from the given JSON object.
	*
	* @param {Object} json - The JSON object.
	* @return {FuzzyModule} A reference to this fuzzy module.
	*/
	fromJSON( json ) {

		const fuzzySets = new Map(); // used for rules

		// flvs

		const flvsJSON = json.flvs;

		for ( let i = 0, l = flvsJSON.length; i < l; i ++ ) {

			const flvJSON = flvsJSON[ i ];
			const name = flvJSON.name;
			const flv = new FuzzyVariable().fromJSON( flvJSON.flv );

			this.addFLV( name, flv );

			for ( let fuzzySet of flv.fuzzySets ) {

				fuzzySets.set( fuzzySet.uuid, fuzzySet );

			}

		}

		// rules

		const rulesJSON = json.rules;

		for ( let i = 0, l = rulesJSON.length; i < l; i ++ ) {

			const ruleJSON = rulesJSON[ i ];
			const rule = new FuzzyRule().fromJSON( ruleJSON, fuzzySets );

			this.addRule( rule );

		}

		return this;

	}

}

FuzzyModule.DEFUZ_TYPE = Object.freeze( {
	MAXAV: 0,
	CENTROID: 1
} );

/**
* Base class for representing a goal in context of Goal-driven agent design.
*
* @author {@link https://github.com/Mugen87|Mugen87}
*/
class Goal {

	/**
	* Constructs a new goal.
	*
	* @param {GameEntity} owner - The owner of this goal.
	*/
	constructor( owner = null ) {

		/**
		* The owner of this goal.
		* @type GameEntity
		*/
		this.owner = owner;

		/**
		* The status of this goal.
		* @type Status
		* @default INACTIVE
		*/
		this.status = Goal.STATUS.INACTIVE;

	}

	/**
	* Executed when this goal is activated.
	*/
	activate() {}

	/**
	* Executed in each simulation step.
	*/
	execute() {}

	/**
	* Executed when this goal is satisfied.
	*/
	terminate() {}

	/**
	* Goals can handle messages. Many don't though, so this defines a default behavior
	*
	* @param {Telegram} telegram - The telegram with the message data.
	* @return {Boolean} Whether the message was processed or not.
	*/
	handleMessage( /* telegram */ ) {

		return false;

	}

	/**
	* Returns true if the status of this goal is *ACTIVE*.
	*
	* @return {Boolean} Whether the goal is active or not.
	*/
	active() {

		return this.status === Goal.STATUS.ACTIVE;

	}

	/**
	* Returns true if the status of this goal is *INACTIVE*.
	*
	* @return {Boolean} Whether the goal is inactive or not.
	*/
	inactive() {

		return this.status === Goal.STATUS.INACTIVE;

	}

	/**
	* Returns true if the status of this goal is *COMPLETED*.
	*
	* @return {Boolean} Whether the goal is completed or not.
	*/
	completed() {

		return this.status === Goal.STATUS.COMPLETED;

	}

	/**
	* Returns true if the status of this goal is *FAILED*.
	*
	* @return {Boolean} Whether the goal is failed or not.
	*/
	failed() {

		return this.status === Goal.STATUS.FAILED;

	}

	/**
	* Ensures the goal is replanned if it has failed.
	*
	* @return {Goal} A reference to this goal.
	*/
	replanIfFailed() {

		if ( this.failed() === true ) {

			this.status = Goal.STATUS.INACTIVE;

		}

		return this;

	}

	/**
	* Ensures the goal is activated if it is inactive.
	*
	* @return {Goal} A reference to this goal.
	*/
	activateIfInactive() {

		if ( this.inactive() === true ) {

			this.status = Goal.STATUS.ACTIVE;

			this.activate();

		}

		return this;

	}

	/**
	* Transforms this instance into a JSON object.
	*
	* @return {Object} The JSON object.
	*/
	toJSON() {

		return {
			type: this.constructor.name,
			owner: this.owner.uuid,
			status: this.status
		};

	}

	/**
	* Restores this instance from the given JSON object.
	*
	* @param {Object} json - The JSON object.
	* @return {Goal} A reference to this goal.
	*/
	fromJSON( json ) {

		this.owner = json.owner; // uuid
		this.status = json.status;

		return this;

	}

	/**
	* Restores UUIDs with references to GameEntity objects.
	*
	* @param {Map} entities - Maps game entities to UUIDs.
	* @return {Goal} A reference to this goal.
	*/
	resolveReferences( entities ) {

		this.owner = entities.get( this.owner ) || null;

		return this;

	}

}

Goal.STATUS = Object.freeze( {
	ACTIVE: 'active', // the goal has been activated and will be processed each update step
	INACTIVE: 'inactive', // the goal is waiting to be activated
	COMPLETED: 'completed', // the goal has completed and will be removed on the next update
	FAILED: 'failed' // the goal has failed and will either replan or be removed on the next update
} );

/**
* Class representing a composite goal. Essentially it's a goal which consists of subgoals.
*
* @author {@link https://github.com/Mugen87|Mugen87}
* @augments Goal
*/
class CompositeGoal extends Goal {

	/**
	* Constructs a new composite goal.
	*
	* @param {GameEntity} owner - The owner of this composite goal.
	*/
	constructor( owner = null ) {

		super( owner );

		/**
		* A list of subgoals.
		* @type Array
		*/
		this.subgoals = new Array();

	}

	/**
	* Adds a goal as a subgoal to this instance.
	*
	* @param {Goal} goal - The subgoal to add.
	* @return {Goal} A reference to this goal.
	*/
	addSubgoal( goal ) {

		this.subgoals.unshift( goal );

		return this;

	}

	/**
	* Removes a subgoal from this instance.
	*
	* @param {Goal} goal - The subgoal to remove.
	* @return {Goal} A reference to this goal.
	*/
	removeSubgoal( goal ) {

		const index = this.subgoals.indexOf( goal );
		this.subgoals.splice( index, 1 );

		return this;

	}

	/**
	* Removes all subgoals and ensures {@link Goal#terminate} is called
	* for each subgoal.
	*
	* @return {Goal} A reference to this goal.
	*/
	clearSubgoals() {

		const subgoals = this.subgoals;

		for ( let i = 0, l = subgoals.length; i < l; i ++ ) {

			const subgoal = subgoals[ i ];

			subgoal.terminate();

		}

		subgoals.length = 0;

		return this;

	}

	/**
	* Returns the current subgoal. If no subgoals are defined, *null* is returned.
	*
	* @return {Goal} The current subgoal.
	*/
	currentSubgoal() {

		const length = this.subgoals.length;

		if ( length > 0 ) {

			return this.subgoals[ length - 1 ];

		} else {

			return null;

		}

	}

	/**
	* Executes the current subgoal of this composite goal.
	*
	* @return {Status} The status of this composite subgoal.
	*/
	executeSubgoals() {

		const subgoals = this.subgoals;

		// remove all completed and failed goals from the back of the subgoal list

		for ( let i = subgoals.length - 1; i >= 0; i -- ) {

			const subgoal = subgoals[ i ];

			if ( ( subgoal.completed() === true ) || ( subgoal.failed() === true ) ) {

				// if the current subgoal is a composite goal, terminate its subgoals too

				if ( subgoal instanceof CompositeGoal ) {

					subgoal.clearSubgoals();

				}

				// terminate the subgoal itself

				subgoal.terminate();
				subgoals.pop();

			} else {

				break;

			}

		}

		// if any subgoals remain, process the one at the back of the list

		const subgoal = this.currentSubgoal();

		if ( subgoal !== null ) {

			subgoal.activateIfInactive();

			subgoal.execute();

			// if subgoal is completed but more subgoals are in the list, return 'ACTIVE'
			// status in order to keep processing the list of subgoals

			if ( ( subgoal.completed() === true ) && ( subgoals.length > 1 ) ) {

				return Goal.STATUS.ACTIVE;

			} else {

				return subgoal.status;

			}

		} else {

			return Goal.STATUS.COMPLETED;

		}

	}

	/**
	* Returns true if this composite goal has subgoals.
	*
	* @return {Boolean} Whether the composite goal has subgoals or not.
	*/
	hasSubgoals() {

		return this.subgoals.length > 0;

	}

	/**
	* Returns true if the given message was processed by the current subgoal.
	*
	* @return {Boolean} Whether the message was processed or not.
	*/
	handleMessage( telegram ) {

		const subgoal = this.currentSubgoal();

		if ( subgoal !== null ) {

			return subgoal.handleMessage( telegram );

		}

		return false;

	}

	/**
	* Transforms this instance into a JSON object.
	*
	* @return {Object} The JSON object.
	*/
	toJSON() {

		const json = super.toJSON();

		json.subgoals = new Array();

		for ( let i = 0, l = this.subgoals.length; i < l; i ++ ) {

			const subgoal = this.subgoals[ i ];
			json.subgoals.push( subgoal.toJSON() );

		}

		return json;

	}

	/**
	* Restores UUIDs with references to GameEntity objects.
	*
	* @param {Map} entities - Maps game entities to UUIDs.
	* @return {CompositeGoal} A reference to this composite goal.
	*/
	resolveReferences( entities ) {

		super.resolveReferences( entities );

		for ( let i = 0, l = this.subgoals.length; i < l; i ++ ) {

			const subgoal = this.subgoals[ i ];
			subgoal.resolveReferences( entities );

		}

		return this;

	}

}

/**
* Base class for representing a goal evaluator in context of Goal-driven agent design.
*
* @author {@link https://github.com/Mugen87|Mugen87}
*/
class GoalEvaluator {

	/**
	* Constructs a new goal evaluator.
	*
	* @param {Number} characterBias - Can be used to adjust the preferences of agents.
	*/
	constructor( characterBias = 1 ) {

		/**
		* Can be used to adjust the preferences of agents. When the desirability score
		* for a goal has been evaluated, it is multiplied by this value.
		* @type Number
		* @default 1
		*/
		this.characterBias = characterBias;

	}

	/**
	* Calculates the desirability. It's a score between 0 and 1 representing the desirability
	* of a goal. This goal is considered as a top level strategy of the agent like *Explore* or
	* *AttackTarget*. Must be implemented by all concrete goal evaluators.
	*
	* @param {GameEntity} owner - The owner of this goal evaluator.
	* @return {Number} The desirability.
	*/
	calculateDesirability( /* owner */ ) {

		return 0;

	}

	/**
	* Executed if this goal evaluator produces the highest desirability. Must be implemented
	* by all concrete goal evaluators.
	*
	* @param {GameEntity} owner - The owner of this goal evaluator.
	*/
	setGoal( /* owner */ ) {}

	/**
	* Transforms this instance into a JSON object.
	*
	* @return {Object} The JSON object.
	*/
	toJSON() {

		return {
			type: this.constructor.name,
			characterBias: this.characterBias
		};

	}

	/**
	* Restores this instance from the given JSON object.
	*
	* @param {Object} json - The JSON object.
	* @return {GoalEvaluator} A reference to this goal evaluator.
	*/
	fromJSON( json ) {

		this.characterBias = json.characterBias;

		return this;

	}

}

/**
* Class for representing the brain of a game entity.
*
* @author {@link https://github.com/Mugen87|Mugen87}
* @augments CompositeGoal
*/
class Think extends CompositeGoal {

	/**
	* Constructs a new *Think* object.
	*
	* @param {GameEntity} owner - The owner of this instance.
	*/
	constructor( owner = null ) {

		super( owner );

		/**
		* A list of goal evaluators.
		* @type Array
		*/
		this.evaluators = new Array();

		//

		this._typesMap = new Map();

	}

	/**
	* Executed when this goal is activated.
	*/
	activate() {

		this.arbitrate();

	}

	/**
	* Executed in each simulation step.
	*/
	execute() {

		this.activateIfInactive();

		const subgoalStatus = this.executeSubgoals();

		if ( subgoalStatus === Goal.STATUS.COMPLETED || subgoalStatus === Goal.STATUS.FAILED ) {

			this.status = Goal.STATUS.INACTIVE;

		}

	}

	/**
	* Executed when this goal is satisfied.
	*/
	terminate() {

		this.clearSubgoals();

	}

	/**
	* Adds the given goal evaluator to this instance.
	*
	* @param {GoalEvaluator} evaluator - The goal evaluator to add.
	* @return {Think} A reference to this instance.
	*/
	addEvaluator( evaluator ) {

		this.evaluators.push( evaluator );

		return this;

	}

	/**
	* Removes the given goal evaluator from this instance.
	*
	* @param {GoalEvaluator} evaluator - The goal evaluator to remove.
	* @return {Think} A reference to this instance.
	*/
	removeEvaluator( evaluator ) {

		const index = this.evaluators.indexOf( evaluator );
		this.evaluators.splice( index, 1 );

		return this;

	}

	/**
	* This method represents the top level decision process of an agent.
	* It iterates through each goal evaluator and selects the one that
	* has the highest score as the current goal.
	*
	* @return {Think} A reference to this instance.
	*/
	arbitrate() {

		const evaluators = this.evaluators;

		let bestDesirability = - 1;
		let bestEvaluator = null;

		// try to find the best top-level goal/strategy for the entity

		for ( let i = 0, l = evaluators.length; i < l; i ++ ) {

			const evaluator = evaluators[ i ];

			let desirability = evaluator.calculateDesirability( this.owner );
			desirability *= evaluator.characterBias;

			if ( desirability >= bestDesirability ) {

				bestDesirability = desirability;
				bestEvaluator = evaluator;

			}

		}

		// use the evaluator to set the respective goal

		if ( bestEvaluator !== null ) {

			bestEvaluator.setGoal( this.owner );

		} else {

			Logger.error( 'YUKA.Think: Unable to determine goal evaluator for game entity:', this.owner );

		}

		return this;

	}

	/**
	* Transforms this instance into a JSON object.
	*
	* @return {Object} The JSON object.
	*/
	toJSON() {

		const json = super.toJSON();

		json.evaluators = new Array();

		for ( let i = 0, l = this.evaluators.length; i < l; i ++ ) {

			const evaluator = this.evaluators[ i ];
			json.evaluators.push( evaluator.toJSON() );

		}

		return json;

	}

	/**
	* Restores this instance from the given JSON object.
	*
	* @param {Object} json - The JSON object.
	* @return {Think} A reference to this instance.
	*/
	fromJSON( json ) {

		super.fromJSON( json );

		const typesMap = this._typesMap;

		this.evaluators.length = 0;
		this.terminate();

		// evaluators

		for ( let i = 0, l = json.evaluators.length; i < l; i ++ ) {

			const evaluatorJSON = json.evaluators[ i ];
			const type = evaluatorJSON.type;

			const ctor = typesMap.get( type );

			if ( ctor !== undefined ) {

				const evaluator = new ctor().fromJSON( evaluatorJSON );
				this.evaluators.push( evaluator );

			} else {

				Logger.warn( 'YUKA.Think: Unsupported goal evaluator type:', type );
				continue;

			}

		}

		// goals

		function parseGoal( goalJSON ) {

			const type = goalJSON.type;

			const ctor = typesMap.get( type );

			if ( ctor !== undefined ) {

				const goal = new ctor().fromJSON( goalJSON );

				const subgoalsJSON = goalJSON.subgoals;

				if ( subgoalsJSON !== undefined ) {

					// composite goal

					for ( let i = 0, l = subgoalsJSON.length; i < l; i ++ ) {

						const subgoal = parseGoal( subgoalsJSON[ i ] );

						if ( subgoal ) goal.subgoals.push( subgoal );

					}

				}

				return goal;

			} else {

				Logger.warn( 'YUKA.Think: Unsupported goal evaluator type:', type );
				return;

			}

		}

		for ( let i = 0, l = json.subgoals.length; i < l; i ++ ) {

			const subgoal = parseGoal( json.subgoals[ i ] );

			if ( subgoal ) this.subgoals.push( subgoal );

		}

		return this;

	}

	/**
	* Registers a custom type for deserialization. When calling {@link Think#fromJSON}
	* this instance is able to pick the correct constructor in order to create custom
	* goals or goal evaluators.
	*
	* @param {String} type - The name of the goal or goal evaluator.
	* @param {Function} constructor - The constructor function.
	* @return {Think} A reference to this instance.
	*/
	registerType( type, constructor ) {

		this._typesMap.set( type, constructor );

		return this;

	}

}

/**
* Base class for graph edges.
*
* @author {@link https://github.com/Mugen87|Mugen87}
*/
class Edge {

	/**
	* Constructs a new edge.
	*
	* @param {Number} from - The index of the from node.
	* @param {Number} to - The index of the to node.
	* @param {Number} cost - The cost of this edge.
	*/
	constructor( from = - 1, to = - 1, cost = 0 ) {

		/**
		* The index of the *from* node.
		* @type Number
		* @default -1
		*/
		this.from = from;

		/**
		* The index of the *to* node.
		* @type Number
		* @default -1
		*/
		this.to = to;

		/**
		* The cost of this edge. This could be for example a distance or time value.
		* @type Number
		* @default 0
		*/
		this.cost = cost;

	}

	/**
	* Copies all values from the given edge to this edge.
	*
	* @param {Edge} edge - The edge to copy.
	* @return {Edge} A reference to this edge.
	*/
	copy( edge ) {

		this.from = edge.from;
		this.to = edge.to;
		this.cost = edge.cost;

		return this;

	}

	/**
	* Creates a new edge and copies all values from this edge.
	*
	* @return {Edge} A new edge.
	*/
	clone() {

		return new this.constructor().copy( this );

	}

	/**
	* Transforms this instance into a JSON object.
	*
	* @return {Object} The JSON object.
	*/
	toJSON() {

		return {
			type: this.constructor.name,
			from: this.from,
			to: this.to,
			cost: this.cost
		};

	}

	/**
	* Restores this instance from the given JSON object.
	*
	* @param {Object} json - The JSON object.
	* @return {Edge} A reference to this edge.
	*/
	fromJSON( json ) {

		this.from = json.from;
		this.to = json.to;
		this.cost = json.cost;

		return this;

	}

}

/**
* Base class for graph nodes.
*
* @author {@link https://github.com/Mugen87|Mugen87}
*/
class Node {

	/**
	* Constructs a new node.
	*
	* @param {Number} index - The unique index of this node.
	*/
	constructor( index = - 1 ) {

		/**
		* The unique index of this node. The default value *-1* means invalid index.
		* @type Number
		* @default -1
		*/
		this.index = index;

	}

	/**
	* Transforms this instance into a JSON object.
	*
	* @return {Object} The JSON object.
	*/
	toJSON() {

		return {
			type: this.constructor.name,
			index: this.index
		};

	}

	/**
	* Restores this instance from the given JSON object.
	*
	* @param {Object} json - The JSON object.
	* @return {Node} A reference to this node.
	*/
	fromJSON( json ) {

		this.index = json.index;
		return this;

	}

}

/**
* Class representing a sparse graph implementation based on adjacency lists.
* A sparse graph can be used to model many different types of graphs like navigation
* graphs (pathfinding), dependency graphs (e.g. technology trees) or state graphs
* (a representation of every possible state in a game).
*
* @author {@link https://github.com/Mugen87|Mugen87}
*/
class Graph {

	/**
	* Constructs a new graph.
	*/
	constructor() {

		/**
		* Whether this graph is directed or not.
		* @type Boolean
		* @default false
		*/
		this.digraph = false;

		this._nodes = new Map(); // contains all nodes in a map: (nodeIndex => node)
		this._edges = new Map(); // adjacency list for each node: (nodeIndex => edges)

	}

	/**
	* Adds a node to the graph.
	*
	* @param {Node} node - The node to add.
	* @return {Graph} A reference to this graph.
	*/
	addNode( node ) {

		const index = node.index;

		this._nodes.set( index, node );
		this._edges.set( index, new Array() );

		return this;

	}

	/**
	* Adds an edge to the graph. If the graph is undirected, the method
	* automatically creates the opponent edge.
	*
	* @param {Edge} edge - The edge to add.
	* @return {Graph} A reference to this graph.
	*/
	addEdge( edge ) {

		let edges;

		edges = this._edges.get( edge.from );
		edges.push( edge );

		if ( this.digraph === false ) {

			const oppositeEdge = edge.clone();

			oppositeEdge.from = edge.to;
			oppositeEdge.to = edge.from;

			edges = this._edges.get( edge.to );
			edges.push( oppositeEdge );

		}

		return this;

	}

	/**
	* Returns a node for the given node index. If no node is found,
	* *null* is returned.
	*
	* @param {Number} index - The index of the node.
	* @return {Node} The requested node.
	*/
	getNode( index ) {

		return this._nodes.get( index ) || null;

	}

	/**
	* Returns an edge for the given *from* and *to* node indices.
	* If no node is found, *null* is returned.
	*
	* @param {Number} from - The index of the from node.
	* @param {Number} to - The index of the to node.
	* @return {Edge} The requested edge.
	*/
	getEdge( from, to ) {

		if ( this.hasNode( from ) && this.hasNode( to ) ) {

			const edges = this._edges.get( from );

			for ( let i = 0, l = edges.length; i < l; i ++ ) {

				const edge = edges[ i ];

				if ( edge.to === to ) {

					return edge;

				}

			}

		}

		return null;

	}

	/**
	* Gathers all nodes of the graph and stores them into the given array.
	*
	* @param {Array} result - The result array.
	* @return {Array} The result array.
	*/
	getNodes( result ) {

		result.length = 0;
		result.push( ...this._nodes.values() );

		return result;

	}

	/**
	* Gathers all edges leading from the given node index and stores them
	* into the given array.
	*
	* @param {Number} index - The node index.
	* @param {Array} result - The result array.
	* @return {Array} The result array.
	*/
	getEdgesOfNode( index, result ) {

		const edges = this._edges.get( index );

		if ( edges !== undefined ) {

			result.length = 0;
			result.push( ...edges );

		}

		return result;

	}

	/**
	* Returns the node count of the graph.
	*
	* @return {number} The amount of nodes.
	*/
	getNodeCount() {

		return this._nodes.size;

	}

	/**
	* Returns the edge count of the graph.
	*
	* @return {number} The amount of edges.
	*/
	getEdgeCount() {

		let count = 0;

		for ( const edges of this._edges.values() ) {

			count += edges.length;

		}

		return count;

	}

	/**
	* Removes the given node from the graph and all edges which are connected
	* with this node.
	*
	* @param {Node} node - The node to remove.
	* @return {Graph} A reference to this graph.
	*/
	removeNode( node ) {

		this._nodes.delete( node.index );

		if ( this.digraph === false ) {

			// if the graph is not directed, remove all edges leading to this node

			const edges = this._edges.get( node.index );

			for ( const edge of edges ) {

				const edgesOfNeighbor = this._edges.get( edge.to );

				for ( let i = ( edgesOfNeighbor.length - 1 ); i >= 0; i -- ) {

					const edgeNeighbor = edgesOfNeighbor[ i ];

					if ( edgeNeighbor.to === node.index ) {

						const index = edgesOfNeighbor.indexOf( edgeNeighbor );
						edgesOfNeighbor.splice( index, 1 );

						break;

					}

				}

			}

		} else {

			// if the graph is directed, remove the edges the slow way

			for ( const edges of this._edges.values() ) {

				for ( let i = ( edges.length - 1 ); i >= 0; i -- ) {

					const edge = edges[ i ];

					if ( ! this.hasNode( edge.to ) || ! this.hasNode( edge.from ) ) {

						const index = edges.indexOf( edge );
						edges.splice( index, 1 );

					}

				}

			}

		}

		// delete edge list of node (edges leading from this node)

		this._edges.delete( node.index );

		return this;

	}

	/**
	* Removes the given edge from the graph. If the graph is undirected, the
	* method also removes the opponent edge.
	*
	* @param {Edge} edge - The edge to remove.
	* @return {Graph} A reference to this graph.
	*/
	removeEdge( edge ) {

		// delete the edge from the node's edge list

		const edges = this._edges.get( edge.from );

		if ( edges !== undefined ) {

			const index = edges.indexOf( edge );
			edges.splice( index, 1 );

			// if the graph is not directed, delete the edge connecting the node in the opposite direction

			if ( this.digraph === false ) {

				const edges = this._edges.get( edge.to );

				for ( let i = 0, l = edges.length; i < l; i ++ ) {

					const e = edges[ i ];

					if ( e.to === edge.from ) {

						const index = edges.indexOf( e );
						edges.splice( index, 1 );
						break;

					}

				}

			}

		}

		return this;

	}

	/**
	* Return true if the graph has the given node index.
	*
	* @param {Number} index - The node index to test.
	* @return {Boolean} Whether this graph has the node or not.
	*/
	hasNode( index ) {

		return this._nodes.has( index );

	}

	/**
	* Return true if the graph has an edge connecting the given
	* *from* and *to* node indices.
	*
	* @param {Number} from - The index of the from node.
	* @param {Number} to - The index of the to node.
	* @return {Boolean} Whether this graph has the edge or not.
	*/
	hasEdge( from, to ) {

		if ( this.hasNode( from ) && this.hasNode( to ) ) {

			const edges = this._edges.get( from );

			for ( let i = 0, l = edges.length; i < l; i ++ ) {

				const edge = edges[ i ];

				if ( edge.to === to ) {

					return true;

				}

			}

			return false;

		} else {

			return false;

		}

	}

	/**
	* Removes all nodes and edges from this graph.
	*
	* @return {Graph} A reference to this graph.
	*/
	clear() {

		this._nodes.clear();
		this._edges.clear();

		return this;

	}

	/**
	* Transforms this instance into a JSON object.
	*
	* @return {Object} The JSON object.
	*/
	toJSON() {

		const json = {
			type: this.constructor.name,
			digraph: this.digraph
		};

		const edges = new Array();
		const nodes = new Array();

		for ( let [ key, value ] of this._nodes.entries() ) {

			const adjacencyList = new Array();

			this.getEdgesOfNode( key, adjacencyList );

			for ( let i = 0, l = adjacencyList.length; i < l; i ++ ) {

				edges.push( adjacencyList[ i ].toJSON() );

			}

			nodes.push( value.toJSON() );

		}

		json._edges = edges;
		json._nodes = nodes;

		return json;

	}

	/**
	* Restores this instance from the given JSON object.
	*
	* @param {Object} json - The JSON object.
	* @return {Graph} A reference to this graph.
	*/
	fromJSON( json ) {

		this.digraph = json.digraph;

		for ( let i = 0, l = json._nodes.length; i < l; i ++ ) {

			this.addNode( new Node().fromJSON( json._nodes[ i ] ) );

		}

		for ( let i = 0, l = json._edges.length; i < l; i ++ ) {

			this.addEdge( new Edge().fromJSON( json._edges[ i ] ) );

		}

		return this;

	}

}

/**
* Class for representing a heuristic for graph search algorithms based
* on the euclidean distance. The heuristic assumes that the node have
* a *position* property of type {@link Vector3}.
*
* @author {@link https://github.com/Mugen87|Mugen87}
*/
class HeuristicPolicyEuclid {

	/**
	* Calculates the euclidean distance between two nodes.
	*
	* @param {Graph} graph - The graph.
	* @param {Number} source - The index of the source node.
	* @param {Number} target - The index of the target node.
	* @return {Number} The euclidean distance between both nodes.
	*/
	static calculate( graph, source, target ) {

		const sourceNode = graph.getNode( source );
		const targetNode = graph.getNode( target );

		return sourceNode.position.distanceTo( targetNode.position );

	}

}

/**
* Class for representing a heuristic for graph search algorithms based
* on the squared euclidean distance. The heuristic assumes that the node
* have a *position* property of type {@link Vector3}.
*
* @author {@link https://github.com/Mugen87|Mugen87}
*/
class HeuristicPolicyEuclidSquared {

	/**
	* Calculates the squared euclidean distance between two nodes.
	*
	* @param {Graph} graph - The graph.
	* @param {Number} source - The index of the source node.
	* @param {Number} target - The index of the target node.
	* @return {Number} The squared euclidean distance between both nodes.
	*/
	static calculate( graph, source, target ) {

		const sourceNode = graph.getNode( source );
		const targetNode = graph.getNode( target );

		return sourceNode.position.squaredDistanceTo( targetNode.position );

	}

}

/**
* Class for representing a heuristic for graph search algorithms based
* on the manhattan distance. The heuristic assumes that the node
* have a *position* property of type {@link Vector3}.
*
* @author {@link https://github.com/Mugen87|Mugen87}
*/
class HeuristicPolicyManhattan {

	/**
	* Calculates the manhattan distance between two nodes.
	*
	* @param {Graph} graph - The graph.
	* @param {Number} source - The index of the source node.
	* @param {Number} target - The index of the target node.
	* @return {Number} The manhattan distance between both nodes.
	*/
	static calculate( graph, source, target ) {

		const sourceNode = graph.getNode( source );
		const targetNode = graph.getNode( target );

		return sourceNode.position.manhattanDistanceTo( targetNode.position );

	}

}

/**
* Class for representing a heuristic for graph search algorithms based
* on Dijkstra's algorithm.
*
* @author {@link https://github.com/Mugen87|Mugen87}
*/
class HeuristicPolicyDijkstra {

	/**
	* This heuristic always returns *0*. The {@link AStar} algorithm
	* behaves with this heuristic exactly like {@link Dijkstra}
	*
	* @param {Graph} graph - The graph.
	* @param {Number} source - The index of the source node.
	* @param {Number} target - The index of the target node.
	* @return {Number} The manhattan distance between both nodes.
	*/
	static calculate( /* graph, source, target */ ) {

		return 0;

	}

}

/**
 * Class for representing a binary heap priority queue that enables
 * more efficient sorting of arrays. The implementation is based on
 * {@link https://github.com/mourner/tinyqueue tinyqueue}.
 *
 * @author {@link https://github.com/Mugen87|Mugen87}
 */
class PriorityQueue {

	/**
	* Constructs a new priority queue.
	*
	* @param {Function} compare - The compare function used for sorting.
	*/
	constructor( compare = defaultCompare ) {

		/**
		* The data items of the priority queue.
		* @type Array
		*/
		this.data = new Array();

		/**
		* The length of the priority queue.
		* @type Number
		* @default 0
		*/
		this.length = 0;

		/**
		* The compare function used for sorting.
		* @type Function
		* @default defaultCompare
		*/
		this.compare = compare;

	}

	/**
	* Pushes an item to the priority queue.
	*
	* @param {Object} item - The item to add.
	*/
	push( item ) {

		this.data.push( item );
		this.length ++;
		this._up( this.length - 1 );

	}

	/**
	* Returns the item with the highest priority and removes
	* it from the priority queue.
	*
	* @return {Object} The item with the highest priority.
	*/
	pop() {

		if ( this.length === 0 ) return null;

		const top = this.data[ 0 ];
		this.length --;

		if ( this.length > 0 ) {

			this.data[ 0 ] = this.data[ this.length ];
			this._down( 0 );

		}

		this.data.pop();

		return top;

	}

	/**
	* Returns the item with the highest priority without removal.
	*
	* @return {Object} The item with the highest priority.
	*/
	peek() {

		return this.data[ 0 ] || null;

	}

	_up( index ) {

		const data = this.data;
		const compare = this.compare;
		const item = data[ index ];

		while ( index > 0 ) {

			const parent = ( index - 1 ) >> 1;
			const current = data[ parent ];
			if ( compare( item, current ) >= 0 ) break;
			data[ index ] = current;
			index = parent;

		}

		data[ index ] = item;

	}

	_down( index ) {

		const data = this.data;
		const compare = this.compare;
		const item = data[ index ];
		const halfLength = this.length >> 1;

		while ( index < halfLength ) {

			let left = ( index << 1 ) + 1;
			let right = left + 1;
			let best = data[ left ];

			if ( right < this.length && compare( data[ right ], best ) < 0 ) {

				left = right;
				best = data[ right ];

			}

			if ( compare( best, item ) >= 0 ) break;

			data[ index ] = best;
			index = left;

		}


		data[ index ] = item;

	}

}

/* istanbul ignore next */

function defaultCompare( a, b ) {

	return ( a < b ) ? - 1 : ( a > b ) ? 1 : 0;

}

/**
* Implementation of the AStar algorithm.
*
* @author {@link https://github.com/Mugen87|Mugen87}
*/
class AStar {

	/**
	* Constructs an AStar algorithm object.
	*
	* @param {Graph} graph - The graph.
	* @param {Number} source - The node index of the source node.
	* @param {Number} target - The node index of the target node.
	*/
	constructor( graph = null, source = - 1, target = - 1 ) {

		/**
		* The graph.
		* @type Graph
		*/
		this.graph = graph;

		/**
		* The node index of the source node.
		* @type Number
		*/
		this.source = source;

		/**
		* The node index of the target node.
		* @type Number
		*/
		this.target = target;

		/**
		* Whether the search was successful or not.
		* @type Boolean
		* @default false
		*/
		this.found = false;

		/**
		* The heuristic of the search.
		* @type Object
		* @default HeuristicPolicyEuclid
		*/
		this.heuristic = HeuristicPolicyEuclid;

		this._cost = new Map(); // contains the "real" accumulative cost to a node
		this._shortestPathTree = new Map();
		this._searchFrontier = new Map();

	}

	/**
	* Executes the graph search. If the search was successful, {@link AStar#found}
	* is set to true.
	*
	* @return {AStar} A reference to this AStar object.
	*/
	search() {

		const outgoingEdges = new Array();
		const pQueue = new PriorityQueue( compare );

		pQueue.push( {
			cost: 0,
			index: this.source
		} );

		// while the queue is not empty

		while ( pQueue.length > 0 ) {

			const nextNode = pQueue.pop();
			const nextNodeIndex = nextNode.index;

			// if the shortest path tree has the given node, we already found the shortest
			// path to this particular one

			if ( this._shortestPathTree.has( nextNodeIndex ) ) continue;

			// move this edge from the frontier to the shortest path tree

			if ( this._searchFrontier.has( nextNodeIndex ) === true ) {

				this._shortestPathTree.set( nextNodeIndex, this._searchFrontier.get( nextNodeIndex ) );

			}

			// if the target has been found exit

			if ( nextNodeIndex === this.target ) {

				this.found = true;

				return this;

			}

			// now relax the edges

			this.graph.getEdgesOfNode( nextNodeIndex, outgoingEdges );

			for ( let i = 0, l = outgoingEdges.length; i < l; i ++ ) {

				const edge = outgoingEdges[ i ];

				// A* cost formula : F = G + H

				// G is the cumulative cost to reach a node

				const G = ( this._cost.get( nextNodeIndex ) || 0 ) + edge.cost;

				// H is the heuristic estimate of the distance to the target

				const H = this.heuristic.calculate( this.graph, edge.to, this.target );

				// F is the sum of G and H

				const F = G + H;

				// We enhance our search frontier in two cases:
				// 1. If the node was never on the search frontier
				// 2. If the cost to this node is better than before

				if ( ( this._searchFrontier.has( edge.to ) === false ) || G < ( this._cost.get( edge.to ) ) ) {

					this._cost.set( edge.to, G );

					this._searchFrontier.set( edge.to, edge );

					pQueue.push( {
						cost: F,
						index: edge.to
					} );

				}

			}

		}

		this.found = false;

		return this;

	}

	/**
	* Returns the shortest path from the source to the target node as an array of node indices.
	*
	* @return {Array} The shortest path.
	*/
	getPath() {

		// array of node indices that comprise the shortest path from the source to the target

		const path = new Array();

		// just return an empty path if no path to target found or if no target has been specified

		if ( this.found === false || this.target === - 1 ) return path;

		// start with the target of the path

		let currentNode = this.target;

		path.push( currentNode );

		// while the current node is not the source node keep processing

		while ( currentNode !== this.source ) {

			// determine the parent of the current node

			currentNode = this._shortestPathTree.get( currentNode ).from;

			// push the new current node at the beginning of the array

			path.unshift( currentNode );

		}

		return path;

	}

	/**
	* Returns the search tree of the algorithm as an array of edges.
	*
	* @return {Array} The search tree.
	*/
	getSearchTree() {

		return [ ...this._shortestPathTree.values() ];

	}

	/**
	* Clears the internal state of the object. A new search is now possible.
	*
	* @return {AStar} A reference to this AStar object.
	*/
	clear() {

		this.found = false;

		this._cost.clear();
		this._shortestPathTree.clear();
		this._searchFrontier.clear();

		return this;

	}

}


function compare( a, b ) {

	return ( a.cost < b.cost ) ? - 1 : ( a.cost > b.cost ) ? 1 : 0;

}

/**
* Implementation of Breadth-first Search.
*
* @author {@link https://github.com/Mugen87|Mugen87}
*/
class BFS {

	/**
	* Constructs a BFS algorithm object.
	*
	* @param {Graph} graph - The graph.
	* @param {Number} source - The node index of the source node.
	* @param {Number} target - The node index of the target node.
	*/
	constructor( graph = null, source = - 1, target = - 1 ) {

		/**
		* The graph.
		* @type Graph
		*/
		this.graph = graph;

		/**
		* The node index of the source node.
		* @type Number
		*/
		this.source = source;

		/**
		* The node index of the target node.
		* @type Number
		*/
		this.target = target;

		/**
		* Whether the search was successful or not.
		* @type Boolean
		* @default false
		*/
		this.found = false;

		this._route = new Map(); // this holds the route taken to the target
		this._visited = new Set(); // holds the visited nodes

		this._spanningTree = new Set(); // for debugging purposes

	}

	/**
	* Executes the graph search. If the search was successful, {@link BFS#found}
	* is set to true.
	*
	* @return {BFS} A reference to this BFS object.
	*/
	search() {

		// create a queue(FIFO) of edges, done via an array

		const queue = new Array();
		const outgoingEdges = new Array();

		// create a dummy edge and put on the queue to begin the search

		const startEdge = new Edge( this.source, this.source );

		queue.push( startEdge );

		// mark the source node as visited

		this._visited.add( this.source );

		// while there are edges in the queue keep searching

		while ( queue.length > 0 ) {

			// grab the first edge and remove it from the queue

			const nextEdge = queue.shift();

			// make a note of the parent of the node this edge points to

			this._route.set( nextEdge.to, nextEdge.from );

			// expand spanning tree

			if ( nextEdge !== startEdge ) {

				this._spanningTree.add( nextEdge );

			}

			// if the target has been found the method can return success

			if ( nextEdge.to === this.target ) {

				this.found = true;

				return this;

			}

			// determine outgoing edges

			this.graph.getEdgesOfNode( nextEdge.to, outgoingEdges );

			// push the edges leading from the node this edge points to onto the
			// queue (provided the edge does not point to a previously visited node)

			for ( let i = 0, l = outgoingEdges.length; i < l; i ++ ) {

				const edge = outgoingEdges[ i ];

				if ( this._visited.has( edge.to ) === false ) {

					queue.push( edge );

					// the node is marked as visited here, BEFORE it is examined,
					// because it ensures a maximum of N edges are ever placed in the queue rather than E edges.
					// (N = number of nodes, E = number of edges)

					this._visited.add( edge.to );

				}

			}

		}

		this.found = false;

		return this;

	}

	/**
	* Returns the shortest path from the source to the target node as an array of node indices.
	*
	* @return {Array} The shortest path.
	*/
	getPath() {

		// array of node indices that comprise the shortest path from the source to the target

		const path = new Array();

		// just return an empty path if no path to target found or if no target has been specified

		if ( this.found === false || this.target === - 1 ) return path;

		// start with the target of the path

		let currentNode = this.target;

		path.push( currentNode );

		// while the current node is not the source node keep processing

		while ( currentNode !== this.source ) {

			// determine the parent of the current node

			currentNode = this._route.get( currentNode );

			// push the new current node at the beginning of the array

			path.unshift( currentNode );

		}

		return path;

	}

	/**
	* Returns the search tree of the algorithm as an array of edges.
	*
	* @return {Array} The search tree.
	*/
	getSearchTree() {

		return [ ...this._spanningTree ];

	}

	/**
	* Clears the internal state of the object. A new search is now possible.
	*
	* @return {BFS} A reference to this BFS object.
	*/
	clear() {

		this.found = false;

		this._route.clear();
		this._visited.clear();
		this._spanningTree.clear();

		return this;

	}

}

/**
* Implementation of Depth-first Search.
*
* @author {@link https://github.com/Mugen87|Mugen87}
*/
class DFS {

	/**
	* Constructs a DFS algorithm object.
	*
	* @param {Graph} graph - The graph.
	* @param {Number} source - The node index of the source node.
	* @param {Number} target - The node index of the target node.
	*/
	constructor( graph = null, source = - 1, target = - 1 ) {

		/**
		* The graph.
		* @type Graph
		*/
		this.graph = graph;

		/**
		* The node index of the source node.
		* @type Number
		*/
		this.source = source;

		/**
		* The node index of the target node.
		* @type Number
		*/
		this.target = target;

		/**
		* Whether the search was successful or not.
		* @type Boolean
		* @default false
		*/
		this.found = false;

		this._route = new Map(); // this holds the route taken to the target
		this._visited = new Set(); // holds the visited nodes

		this._spanningTree = new Set(); // for debugging purposes

	}

	/**
	* Executes the graph search. If the search was successful, {@link DFS#found}
	* is set to true.
	*
	* @return {DFS} A reference to this DFS object.
	*/
	search() {

		// create a stack(LIFO) of edges, done via an array

		const stack = new Array();
		const outgoingEdges = new Array();

		// create a dummy edge and put on the stack to begin the search

		const startEdge = new Edge( this.source, this.source );

		stack.push( startEdge );

		// while there are edges in the stack keep searching

		while ( stack.length > 0 ) {

			// grab the next edge and remove it from the stack

			const nextEdge = stack.pop();

			// make a note of the parent of the node this edge points to

			this._route.set( nextEdge.to, nextEdge.from );

			// and mark it visited

			this._visited.add( nextEdge.to );

			// expand spanning tree

			if ( nextEdge !== startEdge ) {

				this._spanningTree.add( nextEdge );

			}

			// if the target has been found the method can return success

			if ( nextEdge.to === this.target ) {

				this.found = true;

				return this;

			}

			// determine outgoing edges

			this.graph.getEdgesOfNode( nextEdge.to, outgoingEdges );

			// push the edges leading from the node this edge points to onto the
			// stack (provided the edge does not point to a previously visited node)

			for ( let i = 0, l = outgoingEdges.length; i < l; i ++ ) {

				const edge = outgoingEdges[ i ];

				if ( this._visited.has( edge.to ) === false ) {

					stack.push( edge );

				}

			}

		}

		this.found = false;

		return this;

	}

	/**
	* Returns the shortest path from the source to the target node as an array of node indices.
	*
	* @return {Array} The shortest path.
	*/
	getPath() {

		// array of node indices that comprise the shortest path from the source to the target

		const path = new Array();

		// just return an empty path if no path to target found or if no target has been specified

		if ( this.found === false || this.target === - 1 ) return path;

		// start with the target of the path

		let currentNode = this.target;

		path.push( currentNode );

		// while the current node is not the source node keep processing

		while ( currentNode !== this.source ) {

			// determine the parent of the current node

			currentNode = this._route.get( currentNode );

			// push the new current node at the beginning of the array

			path.unshift( currentNode );

		}

		return path;

	}

	/**
	* Returns the search tree of the algorithm as an array of edges.
	*
	* @return {Array} The search tree.
	*/
	getSearchTree() {

		return [ ...this._spanningTree ];

	}

	/**
	* Clears the internal state of the object. A new search is now possible.
	*
	* @return {DFS} A reference to this DFS object.
	*/
	clear() {

		this.found = false;

		this._route.clear();
		this._visited.clear();
		this._spanningTree.clear();

		return this;

	}

}

/**
* Implementation of Dijkstra's algorithm.
*
* @author {@link https://github.com/Mugen87|Mugen87}
*/
class Dijkstra {

	/**
	* Constructs a Dijkstra algorithm object.
	*
	* @param {Graph} graph - The graph.
	* @param {Number} source - The node index of the source node.
	* @param {Number} target - The node index of the target node.
	*/
	constructor( graph = null, source = - 1, target = - 1 ) {

		/**
		* The graph.
		* @type Graph
		*/
		this.graph = graph;

		/**
		* The node index of the source node.
		* @type Number
		*/
		this.source = source;

		/**
		* The node index of the target node.
		* @type Number
		*/
		this.target = target;

		/**
		* Whether the search was successful or not.
		* @type Boolean
		* @default false
		*/
		this.found = false;

		this._cost = new Map(); // total cost of the bast path so far for a given node
		this._shortestPathTree = new Map();
		this._searchFrontier = new Map();

	}

	/**
	* Executes the graph search. If the search was successful, {@link Dijkstra#found}
	* is set to true.
	*
	* @return {Dijkstra} A reference to this Dijkstra object.
	*/
	search() {

		const outgoingEdges = new Array();
		const pQueue = new PriorityQueue( compare$1 );

		pQueue.push( {
			cost: 0,
			index: this.source
		} );

		// while the queue is not empty

		while ( pQueue.length > 0 ) {

			const nextNode = pQueue.pop();
			const nextNodeIndex = nextNode.index;

			// if the shortest path tree has the given node, we already found the shortest
			// path to this particular one

			if ( this._shortestPathTree.has( nextNodeIndex ) ) continue;

			// move this edge from the frontier to the shortest path tree

			if ( this._searchFrontier.has( nextNodeIndex ) === true ) {

				this._shortestPathTree.set( nextNodeIndex, this._searchFrontier.get( nextNodeIndex ) );

			}

			// if the target has been found exit

			if ( nextNodeIndex === this.target ) {

				this.found = true;

				return this;

			}

			// now relax the edges

			this.graph.getEdgesOfNode( nextNodeIndex, outgoingEdges );

			for ( let i = 0, l = outgoingEdges.length; i < l; i ++ ) {

				const edge = outgoingEdges[ i ];

				// the total cost to the node this edge points to is the cost to the
				// current node plus the cost of the edge connecting them.

				const newCost = ( this._cost.get( nextNodeIndex ) || 0 ) + edge.cost;

				// We enhance our search frontier in two cases:
				// 1. If the node was never on the search frontier
				// 2. If the cost to this node is better than before

				if ( ( this._searchFrontier.has( edge.to ) === false ) || newCost < ( this._cost.get( edge.to ) ) ) {

					this._cost.set( edge.to, newCost );

					this._searchFrontier.set( edge.to, edge );

					pQueue.push( {
						cost: newCost,
						index: edge.to
					} );

				}

			}

		}

		this.found = false;

		return this;

	}

	/**
	* Returns the shortest path from the source to the target node as an array of node indices.
	*
	* @return {Array} The shortest path.
	*/
	getPath() {

		// array of node indices that comprise the shortest path from the source to the target

		const path = new Array();

		// just return an empty path if no path to target found or if no target has been specified

		if ( this.found === false || this.target === - 1 ) return path;

		// start with the target of the path

		let currentNode = this.target;

		path.push( currentNode );

		// while the current node is not the source node keep processing

		while ( currentNode !== this.source ) {

			// determine the parent of the current node

			currentNode = this._shortestPathTree.get( currentNode ).from;

			// push the new current node at the beginning of the array

			path.unshift( currentNode );

		}

		return path;

	}

	/**
	* Returns the search tree of the algorithm as an array of edges.
	*
	* @return {Array} The search tree.
	*/
	getSearchTree() {

		return [ ...this._shortestPathTree.values() ];

	}

	/**
	* Clears the internal state of the object. A new search is now possible.
	*
	* @return {Dijkstra} A reference to this Dijkstra object.
	*/
	clear() {

		this.found = false;

		this._cost.clear();
		this._shortestPathTree.clear();
		this._searchFrontier.clear();

		return this;

	}

}


function compare$1( a, b ) {

	return ( a.cost < b.cost ) ? - 1 : ( a.cost > b.cost ) ? 1 : 0;

}

const v1$3 = new Vector3();
const v2$1 = new Vector3();
const v3 = new Vector3();

const xAxis = new Vector3( 1, 0, 0 );
const yAxis = new Vector3( 0, 1, 0 );
const zAxis = new Vector3( 0, 0, 1 );

const triangle$1 = { a: new Vector3(), b: new Vector3(), c: new Vector3() };
const intersection = new Vector3();
const intersections = new Array();

/**
* Class representing a bounding volume hierarchy. The current implementation
* represents single BVH nodes as AABBs. It accepts arbitrary branching factors
* and can subdivide the given geometry until a defined hierarchy depth has been reached.
* Besides, the hierarchy construction is performed top-down and the algorithm only
* performs splits along the cardinal axes.
*
* Reference: Bounding Volume Hierarchies in Real-Time Collision Detection
* by Christer Ericson (chapter 6).
*
* @author {@link https://github.com/robp94|robp94}
* @author {@link https://github.com/Mugen87|Mugen87}
*/
class BVH {

	/**
	* Constructs a new BVH.
	*
	* @param {Number} branchingFactor - The branching factor.
	* @param {Number} depth - The maximum hierarchical depth.
	* @param {Number} primitivesPerNode - The minimum amount of primitives per BVH node.
	*/
	constructor( branchingFactor = 2, primitivesPerNode = 1, depth = 10 ) {

		/**
		* The branching factor (how many nodes per level).
		* @type Number
		* @default 2
		*/
		this.branchingFactor = branchingFactor;

		/**
		* The minimum amount of primitives per BVH node.
		* @type Number
		* @default 10
		*/
		this.primitivesPerNode = primitivesPerNode;

		/**
		* The maximum hierarchical depth.
		* @type Number
		* @default 10
		*/
		this.depth = depth;

		/**
		* The root BVH node.
		* @type BVHNode
		* @default null
		*/
		this.root = null;

	}

	/**
	* Computes a BVH for the given mesh geometry.
	*
	* @param {MeshGeometry} geometry - The mesh geometry.
	* @return {BVH} A reference to this BVH.
	*/
	fromMeshGeometry( geometry ) {

		this.root = new BVHNode();

		// primitives

		const nonIndexedGeometry = geometry.toTriangleSoup();
		const vertices = nonIndexedGeometry.vertices;
		this.root.primitives.push( ...vertices );

		// centroids

		const primitives = this.root.primitives;

		for ( let i = 0, l = primitives.length; i < l; i += 9 ) {

			v1$3.fromArray( primitives, i );
			v2$1.fromArray( primitives, i + 3 );
			v3.fromArray( primitives, i + 6 );

			v1$3.add( v2$1 ).add( v3 ).divideScalar( 3 );

			this.root.centroids.push( v1$3.x, v1$3.y, v1$3.z );

		}

		// build

		this.root.build( this.branchingFactor, this.primitivesPerNode, this.depth, 1 );

		return this;

	}

	/**
	* Executes the given callback for each node of the BVH.
	*
	* @param {Function} callback - The callback to execute.
	* @return {BVH} A reference to this BVH.
	*/
	traverse( callback ) {

		this.root.traverse( callback );

		return this;

	}

}

/**
* A single node in a bounding volume hierarchy (BVH).
*
* @author {@link https://github.com/robp94|robp94}
* @author {@link https://github.com/Mugen87|Mugen87}
*/
class BVHNode {

	/**
	* Constructs a BVH node.
	*/
	constructor() {

		/**
		* The parent BVH node.
		* @type BVHNode
		* @default null
		*/
		this.parent = null;

		/**
		* The child BVH nodes.
		* @type Array
		*/
		this.children = new Array();

		/**
		* The bounding volume of this BVH node.
		* @type AABB
		*/
		this.boundingVolume = new AABB();

		/**
		* The primitives (triangles) of this BVH node.
		* Only filled for leaf nodes.
		* @type Array
		*/
		this.primitives = new Array();

		/**
		* The centroids of the node's triangles.
		* Only filled for leaf nodes.
		* @type Array
		*/
		this.centroids = new Array();

	}

	/**
	* Returns true if this BVH node is a root node.
	*
	* @return {Boolean} Whether this BVH node is a root node or not.
	*/
	root() {

		return this.parent === null;

	}

	/**
	* Returns true if this BVH node is a leaf node.
	*
	* @return {Boolean} Whether this BVH node is a leaf node or not.
	*/
	leaf() {

		return this.children.length === 0;

	}

	/**
	* Returns the depth of this BVH node in its hierarchy.
	*
	* @return {Number} The hierarchical depth of this BVH node.
	*/
	getDepth() {

		let depth = 0;

		let parent = this.parent;

		while ( parent !== null ) {

			parent = parent.parent;
			depth ++;

		}

		return depth;

	}

	/**
	* Executes the given callback for this BVH node and its ancestors.
	*
	* @param {Function} callback - The callback to execute.
	* @return {BVHNode} A reference to this BVH node.
	*/
	traverse( callback ) {

		callback( this );

		for ( let i = 0, l = this.children.length; i < l; i ++ ) {

			 this.children[ i ].traverse( callback );

		}

		return this;

	}

	/**
	* Builds this BVH node. That means the respective bounding volume
	* is computed and the node's primitives are distributed under new child nodes.
	* This only happens if the maximum hierarchical depth is not yet reached and
	* the node does contain enough primitives required for a split.
	*
	* @param {Number} branchingFactor - The branching factor.
	* @param {Number} primitivesPerNode - The minimum amount of primitives per BVH node.
	* @param {Number} maxDepth - The maximum  hierarchical depth.
	* @param {Number} currentDepth - The current hierarchical depth.
	* @return {BVHNode} A reference to this BVH node.
	*/
	build( branchingFactor, primitivesPerNode, maxDepth, currentDepth ) {

		this.computeBoundingVolume();

		// check depth and primitive count

		const primitiveCount = this.primitives.length / 9;
		const newPrimitiveCount = Math.floor( primitiveCount / branchingFactor );

		if ( ( currentDepth <= maxDepth ) && ( newPrimitiveCount >= primitivesPerNode ) ) {

			// split (distribute primitives on new child BVH nodes)

			this.split( branchingFactor );

			// proceed with build on the next hierarchy level

			for ( let i = 0; i < branchingFactor; i ++ ) {

				this.children[ i ].build( branchingFactor, primitivesPerNode, maxDepth, currentDepth + 1 );

			}

		}

		return this;

	}

	/**
	* Computes the AABB for this BVH node.
	*
	* @return {BVHNode} A reference to this BVH node.
	*/
	computeBoundingVolume() {

		const primitives = this.primitives;

		const aabb = this.boundingVolume;

		// compute AABB

		aabb.min.set( Infinity, Infinity, Infinity );
		aabb.max.set( - Infinity, - Infinity, - Infinity );

		for ( let i = 0, l = primitives.length; i < l; i += 3 ) {

			v1$3.x = primitives[ i ];
			v1$3.y = primitives[ i + 1 ];
			v1$3.z = primitives[ i + 2 ];

			aabb.expand( v1$3 );

		}

		return this;

	}

	/**
	* Computes the split axis. Right now, only the cardinal axes
	* are potential split axes.
	*
	* @return {Vector3} The split axis.
	*/
	computeSplitAxis() {

		let maxX, maxY, maxZ = maxY = maxX = - Infinity;
		let minX, minY, minZ = minY = minX = Infinity;

		const centroids = this.centroids;

		for ( let i = 0, l = centroids.length; i < l; i += 3 ) {

			const x = centroids[ i ];
			const y = centroids[ i + 1 ];
			const z = centroids[ i + 2 ];

			if ( x > maxX ) {

				maxX = x;

			}

			if ( y > maxY ) {

				maxY = y;

			}

			if ( z > maxZ ) {

				maxZ = z;

			}

			if ( x < minX ) {

				minX = x;

			}

			if ( y < minY ) {

				minY = y;

			}

			if ( z < minZ ) {

				minZ = z;

			}

		}

		const rangeX = maxX - minX;
		const rangeY = maxY - minY;
		const rangeZ = maxZ - minZ;

		if ( rangeX > rangeY && rangeX > rangeZ ) {

			return xAxis;

		} else if ( rangeY > rangeZ ) {

			return yAxis;

		} else {

			return zAxis;

		}

	}

	/**
	* Splits the node and distributes node's primitives over new child nodes.
	*
	* @param {Number} branchingFactor - The branching factor.
	* @return {BVHNode} A reference to this BVH node.
	*/
	split( branchingFactor ) {

		const centroids = this.centroids;
		const primitives = this.primitives;

		// create (empty) child BVH nodes

		for ( let i = 0; i < branchingFactor; i ++ ) {

			this.children[ i ] = new BVHNode();
			this.children[ i ].parent = this;

		}

		// sort primitives along split axis

		const axis = this.computeSplitAxis();
		const sortedPrimitiveIndices = new Array();

		for ( let i = 0, l = centroids.length; i < l; i += 3 ) {

			v1$3.fromArray( centroids, i );

			// the result from the dot product is our sort criterion.
			// it represents the projection of the centroid on the split axis

			const p = v1$3.dot( axis );
			const primitiveIndex = i / 3;

			sortedPrimitiveIndices.push( { index: primitiveIndex, p: p } );

		}

		sortedPrimitiveIndices.sort( sortPrimitives );

		// distribute data

		const primitveCount = sortedPrimitiveIndices.length;
		const primitivesPerChild = Math.floor( primitveCount / branchingFactor );

		var childIndex = 0;
		var primitivesIndex = 0;

		for ( let i = 0; i < primitveCount; i ++ ) {

			// selected child

			primitivesIndex ++;

			// check if we try to add more primitives to a child than "primitivesPerChild" defines.
			// move primitives to the next child

			if ( primitivesIndex > primitivesPerChild ) {

				// ensure "childIndex" does not overflow (meaning the last child takes all remaining primitives)

				if ( childIndex < ( branchingFactor - 1 ) ) {

					primitivesIndex = 1; // reset primitive index
					childIndex ++; // raise child index

				}

			}

			const child = this.children[ childIndex ];

			// move data to the next level

			// 1. primitives

			const primitiveIndex = sortedPrimitiveIndices[ i ].index;
			const stride = primitiveIndex * 9; // remember the "primitives" array holds raw vertex data defining triangles

			v1$3.fromArray( primitives, stride );
			v2$1.fromArray( primitives, stride + 3 );
			v3.fromArray( primitives, stride + 6 );

			child.primitives.push( v1$3.x, v1$3.y, v1$3.z );
			child.primitives.push( v2$1.x, v2$1.y, v2$1.z );
			child.primitives.push( v3.x, v3.y, v3.z );

			// 2. centroid

			v1$3.fromArray( centroids, primitiveIndex * 3 );

			child.centroids.push( v1$3.x, v1$3.y, v1$3.z );

		}

		// remove centroids/primitives after split from this node

		this.centroids.length = 0;
		this.primitives.length = 0;

		return this;

	}

	/**
	* Performs a ray/BVH node intersection test and stores the closest intersection point
	* to the given 3D vector. If no intersection is detected, *null* is returned.
	*
	* @param {Ray} ray - The ray.
	* @param {Vector3} result - The result vector.
	* @return {Vector3} The result vector.
	*/
	intersectRay( ray, result ) {

		// gather all intersection points along the hierarchy

		if ( ray.intersectAABB( this.boundingVolume, result ) !== null ) {

			if ( this.leaf() === true ) {

				const vertices = this.primitives;

				for ( let i = 0, l = vertices.length; i < l; i += 9 ) {

					// remember: we assume primitives are triangles

					triangle$1.a.fromArray( vertices, i );
					triangle$1.b.fromArray( vertices, i + 3 );
					triangle$1.c.fromArray( vertices, i + 6 );

					if ( ray.intersectTriangle( triangle$1, true, result ) !== null ) {

						intersections.push( result.clone() );

					}

				}

			} else {

				// process childs

				for ( let i = 0, l = this.children.length; i < l; i ++ ) {

					this.children[ i ].intersectRay( ray, result );

				}

			}

		}

		// determine the closest intersection point in the root node (so after
		// the hierarchy was processed)

		if ( this.root() === true ) {

			if ( intersections.length > 0 ) {

				let minDistance = Infinity;

				for ( let i = 0, l = intersections.length; i < l; i ++ ) {

					const squaredDistance = ray.origin.squaredDistanceTo( intersections[ i ] );

					if ( squaredDistance < minDistance ) {

						minDistance = squaredDistance;
						result.copy( intersections[ i ] );

					}

				}

				// reset array

				intersections.length = 0;

				// return closest intersection point

				return result;

			} else {

				// no intersection detected

				return null;

			}

		} else {

			// always return null for non-root nodes

			return null;

		}

	}

	/**
	* Performs a ray/BVH node intersection test. Returns either true or false if
	* there is a intersection or not.
	*
	* @param {Ray} ray - The ray.
	* @return {boolean} Whether there is an intersection or not.
	*/
	intersectsRay( ray ) {

		if ( ray.intersectAABB( this.boundingVolume, intersection ) !== null ) {

			if ( this.leaf() === true ) {

				const vertices = this.primitives;

				for ( let i = 0, l = vertices.length; i < l; i += 9 ) {

					// remember: we assume primitives are triangles

					triangle$1.a.fromArray( vertices, i );
					triangle$1.b.fromArray( vertices, i + 3 );
					triangle$1.c.fromArray( vertices, i + 6 );

					if ( ray.intersectTriangle( triangle$1, true, intersection ) !== null ) {

						return true;

					}

				}

				return false;

			} else {

				// process child BVH nodes

				for ( let i = 0, l = this.children.length; i < l; i ++ ) {

					if ( this.children[ i ].intersectsRay( ray ) === true ) {

						return true;

					}

				}

				return false;

			}

		} else {

			return false;

		}

	}

}

//

function sortPrimitives( a, b ) {

	return a.p - b.p;

}

const p1 = new Vector3();
const p2 = new Vector3();

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

const normal$1 = new Vector3();
const oppositeNormal = new Vector3();
const directionA = new Vector3();
const directionB = new Vector3();

const c = new Vector3();
const d$1 = new Vector3();
const v = new Vector3();

/**
* Implementation of the separating axis theorem (SAT). Used to detect intersections
* between convex polyhedra. The code is based on the presentation {@link http://twvideo01.ubm-us.net/o1/vault/gdc2013/slides/822403Gregorius_Dirk_TheSeparatingAxisTest.pdf The Separating Axis Test between convex polyhedra}
* by Dirk Gregorius (Valve Software) from GDC 2013.
*
* @author {@link https://github.com/Mugen87|Mugen87}
*/
class SAT {

	/**
	* Returns true if the given convex polyhedra intersect. A polyhedron is just
	* an array of {@link Polygon} objects.
	*
	* @param {Polyhedron} polyhedronA - The first convex polyhedron.
	* @param {Polyhedron} polyhedronB - The second convex polyhedron.
	* @return {Boolean} Whether there is an intersection or not.
	*/
	intersects( polyhedronA, polyhedronB ) {

		const resultAB = this._checkFaceDirections( polyhedronA, polyhedronB );

		if ( resultAB ) return false;

		const resultBA = this._checkFaceDirections( polyhedronB, polyhedronA );

		if ( resultBA ) return false;

		const resultEdges = this._checkEdgeDirections( polyhedronA, polyhedronB );

		if ( resultEdges ) return false;

		// no separating axis found, the polyhedra must intersect

		return true;

	}

	// check possible separating axes from the first given polyhedron. the axes
	// are derived from the respective face normals

	_checkFaceDirections( polyhedronA, polyhedronB ) {

		const faces = polyhedronA.faces;

		for ( let i = 0, l = faces.length; i < l; i ++ ) {

			const face = faces[ i ];
			const plane = face.plane;

			oppositeNormal.copy( plane.normal ).multiplyScalar( - 1 );

			const supportVertex = this._getSupportVertex( polyhedronB, oppositeNormal );
			const distance = plane.distanceToPoint( supportVertex );

			if ( distance > 0 ) return true; // separating axis found

		}

		return false;

	}

	// check with possible separating axes computed via the cross product between
	// all edge combinations of both polyhedra

	_checkEdgeDirections( polyhedronA, polyhedronB ) {

		const edgesA = polyhedronA.edges;
		const edgesB = polyhedronB.edges;

		for ( let i = 0, il = edgesA.length; i < il; i ++ ) {

			const edgeA = edgesA[ i ];

			for ( let j = 0, jl = edgesB.length; j < jl; j ++ ) {

				const edgeB = edgesB[ j ];

				edgeA.getDirection( directionA );
				edgeB.getDirection( directionB );

				// edge pruning: only consider edges if they build a face on the minkowski difference

				if ( this._minkowskiFace( edgeA, directionA, edgeB, directionB ) ) {

					// compute axis

					const distance = this._distanceBetweenEdges( edgeA, directionA, edgeB, directionB, polyhedronA );

					if ( distance > 0 ) return true; // separating axis found

				}

			}

		}

		return false;

	}

	// return the most extreme vertex into a given direction

	_getSupportVertex( polyhedron, direction ) {

		let maxProjection = - Infinity;
		let supportVertex = null;

		// iterate over all polygons

		const vertices = polyhedron.vertices;

		for ( let i = 0, l = vertices.length; i < l; i ++ ) {

			const vertex = vertices[ i ];
			const projection = vertex.dot( direction );

			// check vertex to find the best support point

			if ( projection > maxProjection ) {

				maxProjection = projection;
				supportVertex = vertex;

			}

		}

		return supportVertex;

	}

	// returns true if the given edges build a face on the minkowski difference

	_minkowskiFace( edgeA, directionA, edgeB, directionB ) {

		// get face normals which define the vertices of the arcs on the gauss map

		const a = edgeA.polygon.plane.normal;
		const b = edgeA.twin.polygon.plane.normal;
		c.copy( edgeB.polygon.plane.normal );
		d$1.copy( edgeB.twin.polygon.plane.normal );

		// negate normals c and d to account for minkowski difference

		c.multiplyScalar( - 1 );
		d$1.multiplyScalar( - 1 );

		// compute triple products

		// it's not necessary to compute the cross product since edges of convex polyhedron
		// have same direction as the cross product between their adjacent face normals

		const cba = c.dot( directionA );
		const dba = d$1.dot( directionA );
		const adc = a.dot( directionB );
		const bdc = b.dot( directionB );

		// check signs of plane test

		return ( ( cba * dba ) ) < 0 && ( ( adc * bdc ) < 0 ) && ( ( cba * bdc ) > 0 );

	}

	// use gauss map to compute the distance between two edges

	_distanceBetweenEdges( edgeA, directionA, edgeB, directionB, polyhedronA ) {

		// skip parallel edges

		if ( Math.abs( directionA.dot( directionB ) ) === 1 ) return - Infinity;

		// build plane through one edge

		normal$1.crossVectors( directionA, directionB ).normalize();

		// ensure normal points from polyhedron A to B

		if ( normal$1.dot( v.subVectors( edgeA.vertex, polyhedronA.centroid ) ) < 0 ) {

			normal$1.multiplyScalar( - 1 );

		}

		// compute the distance of any vertex on the other edge to that plane
		// no need to compute support points => O(1)

		return normal$1.dot( v.subVectors( edgeB.vertex, edgeA.vertex ) );

	}

}

/**
* Implementation of a half-edge data structure, also known as
* {@link https://en.wikipedia.org/wiki/Doubly_connected_edge_list Doubly connected edge list}.
*
* @author {@link https://github.com/Mugen87|Mugen87}
*/
class HalfEdge {

	/**
	* Constructs a new half-edge.
	*
	* @param {Vector3} vertex - The (origin) vertex of this half-edge.
	*/
	constructor( vertex = new Vector3() ) {

		/**
		* The (origin) vertex of this half-edge.
		* @type Vector3
		*/
		this.vertex = vertex;

		/**
		* A reference to the next half-edge.
		* @type HalfEdge
		*/
		this.next = null;

		/**
		* A reference to the previous half-edge.
		* @type HalfEdge
		*/
		this.prev = null;

		/**
		* A reference to the opponent half-edge.
		* @type HalfEdge
		*/
		this.twin = null;

		/**
		* A reference to its polygon/face.
		* @type Polygon
		*/
		this.polygon = null;

	}

	/**
	* Returns the tail of this half-edge. That's a reference to the previous
	* half-edge vertex.
	*
	* @return {Vector3} The tail vertex.
	*/
	tail() {

		return this.prev ? this.prev.vertex : null;

	}

	/**
	* Returns the head of this half-edge. That's a reference to the own vertex.
	*
	* @return {Vector3} The head vertex.
	*/
	head() {

		return this.vertex;

	}

	/**
	* Computes the length of this half-edge.
	*
	* @return {Number} The length of this half-edge.
	*/
	length() {

		const tail = this.tail();
		const head = this.head();

		if ( tail !== null ) {

			return tail.distanceTo( head );

		}

		return - 1;

	}

	/**
	* Computes the squared length of this half-edge.
	*
	* @return {Number} The squared length of this half-edge.
	*/
	squaredLength() {

		const tail = this.tail();
		const head = this.head();

		if ( tail !== null ) {

			return tail.squaredDistanceTo( head );

		}

		return - 1;

	}

	/**
	* Links the given opponent half edge with this one.
	*
	* @param {HalfEdge} edge - The opponent edge to link.
	* @return {HalfEdge} A reference to this half edge.
	*/
	linkOpponent( edge ) {

		this.twin = edge;
		edge.twin = this;

		return this;

	}

	/**
	* Computes the direction of this half edge. The method assumes the half edge
	* has a valid reference to a previous half edge.
	*
	* @param {Vector3} result - The result vector.
	* @return {Vector3} The result vector.
	*/
	getDirection( result ) {

		return result.subVectors( this.vertex, this.prev.vertex ).normalize();

	}

}

/**
* Class for representing a planar polygon with an arbitrary amount of edges.
*
* @author {@link https://github.com/Mugen87|Mugen87}
* @author {@link https://github.com/robp94|robp94}
*/
class Polygon {

	/**
	* Constructs a new polygon.
	*/
	constructor() {

		/**
		* The centroid of this polygon.
		* @type Vector3
		*/
		this.centroid = new Vector3();

		/**
		* A reference to the first half-edge of this polygon.
		* @type HalfEdge
		*/
		this.edge = null;

		/**
		* A plane abstraction of this polygon.
		* @type Plane
		*/
		this.plane = new Plane();

	}

	/**
	* Creates the polygon based on the given array of points in 3D space.
	* The method assumes the contour (the sequence of points) is defined
	* in CCW order.
	*
	* @param {Array} points - The array of points.
	* @return {Polygon} A reference to this polygon.
	*/
	fromContour( points ) {

		const edges = new Array();

		if ( points.length < 3 ) {

			Logger.error( 'YUKA.Polygon: Unable to create polygon from contour. It needs at least three points.' );
			return this;

		}

		for ( let i = 0, l = points.length; i < l; i ++ ) {

			const edge = new HalfEdge( points[ i ] );
			edges.push( edge );

		}

		// link edges

		for ( let i = 0, l = edges.length; i < l; i ++ ) {

			let current, prev, next;

			if ( i === 0 ) {

				current = edges[ i ];
				prev = edges[ l - 1 ];
			 	next = edges[ i + 1 ];

			} else if ( i === ( l - 1 ) ) {

				current = edges[ i ];
			 	prev = edges[ i - 1 ];
				next = edges[ 0 ];

			} else {

			 	current = edges[ i ];
				prev = edges[ i - 1 ];
				next = edges[ i + 1 ];

			}

			current.prev = prev;
			current.next = next;
			current.polygon = this;

		}

		//

		this.edge = edges[ 0 ];

		//

		this.plane.fromCoplanarPoints( points[ 0 ], points[ 1 ], points[ 2 ] );

		return this;

	}

	/**
	* Computes the centroid for this polygon.
	*
	* @return {Polygon} A reference to this polygon.
	*/
	computeCentroid() {

		const centroid = this.centroid;
		let edge = this.edge;
		let count = 0;

		centroid.set( 0, 0, 0 );

		do {

			centroid.add( edge.vertex );

			count ++;

			edge = edge.next;

		} while ( edge !== this.edge );

		centroid.divideScalar( count );

		return this;

	}

	/**
	* Returns true if the polygon contains the given point.
	*
	* @param {Vector3} point - The point to test.
	* @param {Number} epsilon - A tolerance value.
	* @return {Boolean} Whether this polygon contain the given point or not.
	*/
	contains( point, epsilon = 1e-3 ) {

		const plane = this.plane;
		let edge = this.edge;

		// convex test

		do {

			const v1 = edge.tail();
			const v2 = edge.head();

			if ( leftOn( v1, v2, point ) === false ) {

				return false;

			}

			edge = edge.next;

		} while ( edge !== this.edge );

		// ensure the given point lies within a defined tolerance range

		const distance = plane.distanceToPoint( point );

		if ( Math.abs( distance ) > epsilon ) {

			return false;

		}

		return true;

	}

	/**
	* Returns true if the polygon is convex.
	*
	* @param {Boolean} ccw - Whether the winding order is CCW or not.
	* @return {Boolean} Whether this polygon is convex or not.
	*/
	convex( ccw = true ) {

		let edge = this.edge;

		do {

			const v1 = edge.tail();
			const v2 = edge.head();
			const v3 = edge.next.head();

			if ( ccw ) {

				if ( leftOn( v1, v2, v3 ) === false )	return false;

			} else {

				if ( leftOn( v3, v2, v1 ) === false ) return false;

			}

			edge = edge.next;

		} while ( edge !== this.edge );

		return true;

	}

	/**
	* Returns true if the polygon is coplanar.
	*
	* @param {Number} epsilon - A tolerance value.
	* @return {Boolean} Whether this polygon is coplanar or not.
	*/
	coplanar( epsilon = 1e-3 ) {

		const plane = this.plane;
		let edge = this.edge;

		do {

			const distance = plane.distanceToPoint( edge.vertex );

			if ( Math.abs( distance ) > epsilon ) {

				return false;

			}

			edge = edge.next;

		} while ( edge !== this.edge );

		return true;

	}

	/**
	* Computes the signed distance from the given 3D vector to this polygon. The method
	* uses the polygon's plane abstraction in order to compute this value.
	*
	* @param {Vector3} point - A point in 3D space.
	* @return {Number} The signed distance from the given point to this polygon.
	*/
	distanceToPoint( point ) {

		return this.plane.distanceToPoint( point );

	}

	/**
	* Determines the contour (sequence of points) of this polygon and
	* stores the result in the given array.
	*
	* @param {Array} result - The result array.
	* @return {Array} The result array.
	*/
	getContour( result ) {

		let edge = this.edge;

		result.length = 0;

		do {

			result.push( edge.vertex );

			edge = edge.next;

		} while ( edge !== this.edge );

		return result;

	}

	/**
	* Get the edge that can be used to reach the
	* given polygon over its twin reference.
	*
	* @param {Polygon} polygon - The polygon to reach.
	* @return {HalfEdge} The edge.
	*/
	getEdgeTo( polygon ) {
		let edge = this.edge;
		do {
			if ( edge.twin !== null ) {
				if ( edge.twin.polygon === polygon ) {
					return edge;
				}
			}
			edge = edge.next;

		} while ( edge !== this.edge );
		return null;
	}


	/**
	* Determines the portal edge that can be used to reach the
	* given polygon over its twin reference. The result is stored
	* in the given portal edge data structure. If the given polygon
	* is no direct neighbor, the references of the portal edge data
	* structure are set to null.
	*
	* @param {Polygon} polygon - The polygon to reach.
	* @param {Object} portalEdge - The portal edge.
	* @return {Object} The portal edge.
	*/
	getPortalEdgeTo( polygon, portalEdge ) {

		let edge = this.edge;

		do {

			if ( edge.twin !== null ) {

				if ( edge.twin.polygon === polygon ) {

					portalEdge.left = edge.prev.vertex;
					portalEdge.right = edge.vertex;
					return portalEdge;

				}

			}

			edge = edge.next;

		} while ( edge !== this.edge );

		portalEdge.left = null;
		portalEdge.right = null;

		return portalEdge;

	}

}

// from the book "Computational Geometry in C, Joseph O'Rourke"

function leftOn( a, b, c ) {

	return MathUtils.area( a, b, c ) >= 0;

}

/**
* Base class for polyhedra. It is primarily designed for the internal usage in Yuka.
* Objects of this class are always build up from faces. The edges, vertices and
* the polyhedron's centroid have to be derived from a valid face definition with the
* respective methods.
*
* @author {@link https://github.com/Mugen87|Mugen87}
*/
class Polyhedron {

	/**
	* Constructs a new polyhedron.
	*/
	constructor() {

		/**
		* The faces of this polyhedron.
		* @type Array
		*/
		this.faces = new Array();

		/**
		* A list of unique edges (no opponent half edges).
		* @type Array
		*/
		this.edges = new Array();

		/**
		* A list of unique vertices.
		* @type Array
		*/
		this.vertices = new Array();

		/**
		* The centroid of this polyhedron.
		* @type Vector3
		*/
		this.centroid = new Vector3();

	}

	/**
	* Computes the centroid of this polyhedron. Assumes its faces
	* have valid centroids.
	*
	* @return {Polyhedron} A reference to this polyhedron.
	*/
	computeCentroid() {

		const centroid = this.centroid;
		let faces = this.faces;

		centroid.set( 0, 0, 0 );

		for ( let i = 0, l = faces.length; i < l; i ++ ) {

			const face = faces[ i ];

			centroid.add( face.centroid );

		}

		centroid.divideScalar( faces.length );

		return this;

	}

	/**
	* Computes unique vertices of this polyhedron. Assumes {@link Polyhedron#faces}
	* is properly set.
	*
	* @return {Polyhedron} A reference to this polyhedron.
	*/
	computeUniqueVertices() {

		const faces = this.faces;
		const vertices = this.vertices;

		vertices.length = 0;

		const uniqueVertices = new Set();

		// iterate over all faces

		for ( let i = 0, l = faces.length; i < l; i ++ ) {

			const face = faces[ i ];
			let edge = face.edge;

			// process all edges of a faces

			do {

				// add vertex to set (assuming half edges share unique vertices)

				uniqueVertices.add( edge.vertex );

				edge = edge.next;

			} while ( edge !== face.edge );

		}

		vertices.push( ...uniqueVertices );

		return this;

	}

	/**
	* Computes unique edges of this polyhedron. Assumes {@link Polyhedron#faces}
	* is properly set.
	*
	* @return {Polyhedron} A reference to this polyhedron.
	*/
	computeUniqueEdges() {

		const faces = this.faces;
		const edges = this.edges;

		edges.length = 0;

		// iterate over all faces

		for ( let i = 0, l = faces.length; i < l; i ++ ) {

			const face = faces[ i ];

			let edge = face.edge;

			// process all edges of a faces

			do {

				// only add the edge if the twin was not added before

				if ( edges.includes( edge.twin ) === false ) {

					edges.push( edge );

				}

				edge = edge.next;

			} while ( edge !== face.edge );

		}

		return this;

	}

	/**
	* Configures this polyhedron so it does represent the given AABB.
	*
	* @return {Polyhedron} A reference to this polyhedron.
	*/
	fromAABB( aabb ) {

		this.faces.length = 0;
		this.vertices.length = 0;

		const min = aabb.min;
		const max = aabb.max;

		const vertices = [
			new Vector3( max.x, max.y, max.z ),
			new Vector3( max.x, max.y, min.z ),
			new Vector3( max.x, min.y, max.z ),
			new Vector3( max.x, min.y, min.z ),
			new Vector3( min.x, max.y, max.z ),
			new Vector3( min.x, max.y, min.z ),
			new Vector3( min.x, min.y, max.z ),
			new Vector3( min.x, min.y, min.z )
		];

		this.vertices.push( ... vertices );

		const sideTop = new Polygon().fromContour( [
			vertices[ 4 ],
			vertices[ 0 ],
			vertices[ 1 ],
			vertices[ 5 ]
		] );

		const sideRight = new Polygon().fromContour( [
			vertices[ 2 ],
			vertices[ 3 ],
			vertices[ 1 ],
			vertices[ 0 ]
		] );

		const sideFront = new Polygon().fromContour( [
			vertices[ 6 ],
			vertices[ 2 ],
			vertices[ 0 ],
			vertices[ 4 ]
		] );

		const sideBack = new Polygon().fromContour( [
			vertices[ 3 ],
			vertices[ 7 ],
			vertices[ 5 ],
			vertices[ 1 ]
		] );

		const sideBottom = new Polygon().fromContour( [
			vertices[ 3 ],
			vertices[ 2 ],
			vertices[ 6 ],
			vertices[ 7 ]
		] );

		const sideLeft = new Polygon().fromContour( [
			vertices[ 7 ],
			vertices[ 6 ],
			vertices[ 4 ],
			vertices[ 5 ]
		] );

		// link edges

		sideTop.edge.linkOpponent( sideLeft.edge.prev );
		sideTop.edge.next.linkOpponent( sideFront.edge.prev );
		sideTop.edge.next.next.linkOpponent( sideRight.edge.prev );
		sideTop.edge.prev.linkOpponent( sideBack.edge.prev );

		sideBottom.edge.linkOpponent( sideBack.edge.next );
		sideBottom.edge.next.linkOpponent( sideRight.edge.next );
		sideBottom.edge.next.next.linkOpponent( sideFront.edge.next );
		sideBottom.edge.prev.linkOpponent( sideLeft.edge.next );

		sideLeft.edge.linkOpponent( sideBack.edge.next.next );
		sideBack.edge.linkOpponent( sideRight.edge.next.next );
		sideRight.edge.linkOpponent( sideFront.edge.next.next );
		sideFront.edge.linkOpponent( sideLeft.edge.next.next );

		//

		this.faces.push( sideTop, sideRight, sideFront, sideBack, sideBottom, sideLeft );

		// compute centroids

		sideTop.computeCentroid();
		sideRight.computeCentroid();
		sideFront.computeCentroid();
		sideBack.computeCentroid();
		sideBottom.computeCentroid();
		sideLeft.computeCentroid();

		aabb.getCenter( this.centroid );

		//

		this.computeUniqueEdges();

		return this;

	}

}

const line = new LineSegment();
const plane$1 = new Plane();
const closestPoint = new Vector3();
const up = new Vector3( 0, 1, 0 );
const sat = new SAT();
let polyhedronAABB;

/**
* Class representing a convex hull. This is an implementation of the Quickhull algorithm
* based on the presentation {@link http://media.steampowered.com/apps/valve/2014/DirkGregorius_ImplementingQuickHull.pdf Implementing QuickHull}
* by Dirk Gregorius (Valve Software) from GDC 2014. The algorithm has an average runtime
* complexity of O(nlog(n)), whereas in the worst case it takes O(n²).
*
* @author {@link https://github.com/Mugen87|Mugen87}
* @augments Polyhedron
*/
class ConvexHull extends Polyhedron {

	/**
	* Constructs a new convex hull.
	*/
	constructor() {

		super();

		// tolerance value for various (float) compare operations

		this._tolerance = - 1;

		// this array represents the vertices which will be enclosed by the convex hull

		this._vertices = new Array();

		// two doubly linked lists for easier vertex processing

		this._assigned = new VertexList();
		this._unassigned = new VertexList();

		// this array holds the new faces generated in a single iteration of the algorithm

		this._newFaces = new Array();

	}

	/**
	* Returns true if the given point is inside this convex hull.
	*
	* @param {Vector3} point - A point in 3D space.
	* @return {Boolean} Whether the given point is inside this convex hull or not.
	*/
	containsPoint( point ) {

		const faces = this.faces;

		// use the internal plane abstraction of each face in order to test
		// on what half space the point lies

		for ( let i = 0, l = faces.length; i < l; i ++ ) {

			// if the signed distance is greater than the tolerance value, the point
			// is outside and we can stop processing

			if ( faces[ i ].distanceToPoint( point ) > this._tolerance ) return false;

		}

		return true;

	}

	/**
	* Returns true if this convex hull intersects with the given AABB.
	*
	* @param {AABB} aabb - The AABB to test.
	* @return {Boolean} Whether this convex hull intersects with the given AABB or not.
	*/
	intersectsAABB( aabb ) {

		if ( polyhedronAABB === undefined ) {

			// lazily create the (proxy) polyhedron if necessary

			polyhedronAABB = new Polyhedron().fromAABB( aabb );

		} else {

			// otherwise just ensure up-to-date vertex data.
			// the topology of the polyhedron is equal for all AABBs

			const min = aabb.min;
			const max = aabb.max;

			const vertices = polyhedronAABB.vertices;

			vertices[ 0 ].set( max.x, max.y, max.z );
			vertices[ 1 ].set( max.x, max.y, min.z );
			vertices[ 2 ].set( max.x, min.y, max.z );
			vertices[ 3 ].set( max.x, min.y, min.z );
			vertices[ 4 ].set( min.x, max.y, max.z );
			vertices[ 5 ].set( min.x, max.y, min.z );
			vertices[ 6 ].set( min.x, min.y, max.z );
			vertices[ 7 ].set( min.x, min.y, min.z );

			aabb.getCenter( polyhedronAABB.centroid );

		}

		return sat.intersects( this, polyhedronAABB );

	}

	/**
	* Returns true if this convex hull intersects with the given one.
	*
	* @param {ConvexHull} convexHull - The convex hull to test.
	* @return {Boolean} Whether this convex hull intersects with the given one or not.
	*/
	intersectsConvexHull( convexHull ) {

		return sat.intersects( this, convexHull );

	}

	/**
	* Computes a convex hull that encloses the given set of points. The computation requires
	* at least four points.
	*
	* @param {Array} points - An array of 3D vectors representing points in 3D space.
	* @return {ConvexHull} A reference to this convex hull.
	*/
	fromPoints( points ) {

		if ( points.length < 4 ) {

			Logger.error( 'YUKA.ConvexHull: The given points array needs at least four points.' );
			return this;

		}

		// wrap all points into the internal vertex data structure

		for ( let i = 0, l = points.length; i < l; i ++ ) {

			this._vertices.push( new Vertex( points[ i ] ) );

		}

		// generate the convex hull

		this._generate();

		return this;

	}

	// private API

	// adds a single face to the convex hull by connecting it with the respective horizon edge

	_addAdjoiningFace( vertex, horizonEdge ) {

		// all the half edges are created in ccw order thus the face is always pointing outside the hull

		const face = new Face( vertex.point, horizonEdge.prev.vertex, horizonEdge.vertex );

		this.faces.push( face );

		// join face.getEdge( - 1 ) with the horizon's opposite edge face.getEdge( - 1 ) = face.getEdge( 2 )

		face.getEdge( - 1 ).linkOpponent( horizonEdge.twin );

		return face.getEdge( 0 ); // the half edge whose vertex is the given one

	}

	// adds new faces by connecting the horizon with the new point of the convex hull

	_addNewFaces( vertex, horizon ) {

		this._newFaces = [];

		let firstSideEdge = null;
		let previousSideEdge = null;

		for ( let i = 0, l = horizon.length; i < l; i ++ ) {

			// returns the right side edge

			let sideEdge = this._addAdjoiningFace( vertex, horizon[ i ] );

			if ( firstSideEdge === null ) {

				firstSideEdge = sideEdge;

			} else {

				// joins face.getEdge( 1 ) with previousFace.getEdge( 0 )

				sideEdge.next.linkOpponent( previousSideEdge );

			}

			this._newFaces.push( sideEdge.polygon );
			previousSideEdge = sideEdge;

		}

		// perform final join of new faces

		firstSideEdge.next.linkOpponent( previousSideEdge );

		return this;

	}

	// assigns a single vertex to the given face. that means this face can "see"
	// the vertex and its distance to the vertex is greater than all other faces

	_addVertexToFace( vertex, face ) {

		vertex.face = face;

		if ( face.outside === null ) {

			this._assigned.append( vertex );

			face.outside = vertex;

		} else {

			this._assigned.insertAfter( face.outside, vertex );

		}

		return this;

	}

	// the base iteration of the algorithm. adds a new vertex to the convex hull by
	// connecting faces from the horizon with it.

	_addVertexToHull( vertex ) {

		const horizon = [];

		this._unassigned.clear();

		this._computeHorizon( vertex.point, null, vertex.face, horizon );

		this._addNewFaces( vertex, horizon );

		// reassign 'unassigned' vertices to the new faces

		this._resolveUnassignedPoints( this._newFaces );

		return this;

	}

	// frees memory by resetting internal data structures

	_reset() {

		this._vertices.length = 0;

		this._assigned.clear();
		this._unassigned.clear();

		this._newFaces.length = 0;

		return this;

	}

	// computes the initial hull of the algorithm. it's a tetrahedron created
	// with the extreme vertices of the given set of points

	_computeInitialHull() {

		let v0, v1, v2, v3;

		const vertices = this._vertices;
		const extremes = this._computeExtremes();
		const min = extremes.min;
		const max = extremes.max;

		// 1. Find the two points 'p0' and 'p1' with the greatest 1d separation
		// (max.x - min.x)
		// (max.y - min.y)
		// (max.z - min.z)

		// check x

		let distance, maxDistance;

		maxDistance = max.x.point.x - min.x.point.x;

		v0 = min.x;
		v1 = max.x;

		// check y

		distance = max.y.point.y - min.y.point.y;

		if ( distance > maxDistance ) {

			v0 = min.y;
			v1 = max.y;

			maxDistance = distance;

		}

		// check z

		distance = max.z.point.z - min.z.point.z;

		if ( distance > maxDistance ) {

			v0 = min.z;
			v1 = max.z;

		}

		// 2. The next vertex 'v2' is the one farthest to the line formed by 'v0' and 'v1'

		maxDistance = - Infinity;
		line.set( v0.point, v1.point );

		for ( let i = 0, l = vertices.length; i < l; i ++ ) {

			const vertex = vertices[ i ];

			if ( vertex !== v0 && vertex !== v1 ) {

				line.closestPointToPoint( vertex.point, true, closestPoint );

				distance = closestPoint.squaredDistanceTo( vertex.point );

				if ( distance > maxDistance ) {

					maxDistance = distance;
					v2 = vertex;

				}

			}

		}

		// 3. The next vertex 'v3' is the one farthest to the plane 'v0', 'v1', 'v2'

		maxDistance = - Infinity;
		plane$1.fromCoplanarPoints( v0.point, v1.point, v2.point );

		for ( let i = 0, l = vertices.length; i < l; i ++ ) {

			const vertex = vertices[ i ];

			if ( vertex !== v0 && vertex !== v1 && vertex !== v2 ) {

				distance = Math.abs( plane$1.distanceToPoint( vertex.point ) );

				if ( distance > maxDistance ) {

					maxDistance = distance;
					v3 = vertex;

				}

			}

		}

		// handle case where all points lie in one plane

		if ( plane$1.distanceToPoint( v3.point ) === 0 ) {

			throw 'ERROR: YUKA.ConvexHull: All extreme points lie in a single plane. Unable to compute convex hull.';

		}

		// build initial tetrahedron

		const faces = this.faces;

		if ( plane$1.distanceToPoint( v3.point ) < 0 ) {

			// the face is not able to see the point so 'plane.normal' is pointing outside the tetrahedron

			faces.push(
				new Face( v0.point, v1.point, v2.point ),
				new Face( v3.point, v1.point, v0.point ),
				new Face( v3.point, v2.point, v1.point ),
				new Face( v3.point, v0.point, v2.point )
			);

			// set the twin edge

			// join face[ i ] i > 0, with the first face

			faces[ 1 ].getEdge( 2 ).linkOpponent( faces[ 0 ].getEdge( 1 ) );
			faces[ 2 ].getEdge( 2 ).linkOpponent( faces[ 0 ].getEdge( 2 ) );
			faces[ 3 ].getEdge( 2 ).linkOpponent( faces[ 0 ].getEdge( 0 ) );

			// join face[ i ] with face[ i + 1 ], 1 <= i <= 3

			faces[ 1 ].getEdge( 1 ).linkOpponent( faces[ 2 ].getEdge( 0 ) );
			faces[ 2 ].getEdge( 1 ).linkOpponent( faces[ 3 ].getEdge( 0 ) );
			faces[ 3 ].getEdge( 1 ).linkOpponent( faces[ 1 ].getEdge( 0 ) );

		} else {

			// the face is able to see the point so 'plane.normal' is pointing inside the tetrahedron

			faces.push(
				new Face( v0.point, v2.point, v1.point ),
				new Face( v3.point, v0.point, v1.point ),
				new Face( v3.point, v1.point, v2.point ),
				new Face( v3.point, v2.point, v0.point )
			);

			// set the twin edge

			// join face[ i ] i > 0, with the first face

			faces[ 1 ].getEdge( 2 ).linkOpponent( faces[ 0 ].getEdge( 0 ) );
			faces[ 2 ].getEdge( 2 ).linkOpponent( faces[ 0 ].getEdge( 2 ) );
			faces[ 3 ].getEdge( 2 ).linkOpponent( faces[ 0 ].getEdge( 1 ) );

			// join face[ i ] with face[ i + 1 ], 1 <= i <= 3

			faces[ 1 ].getEdge( 0 ).linkOpponent( faces[ 2 ].getEdge( 1 ) );
			faces[ 2 ].getEdge( 0 ).linkOpponent( faces[ 3 ].getEdge( 1 ) );
			faces[ 3 ].getEdge( 0 ).linkOpponent( faces[ 1 ].getEdge( 1 ) );

		}

		// initial assignment of vertices to the faces of the tetrahedron

		for ( let i = 0, l = vertices.length; i < l; i ++ ) {

			const vertex = vertices[ i ];

			if ( vertex !== v0 && vertex !== v1 && vertex !== v2 && vertex !== v3 ) {

				maxDistance = this._tolerance;
				let maxFace = null;

				for ( let j = 0; j < 4; j ++ ) {

					distance = faces[ j ].distanceToPoint( vertex.point );

					if ( distance > maxDistance ) {

						maxDistance = distance;
						maxFace = faces[ j ];

					}

				}

				if ( maxFace !== null ) {

					this._addVertexToFace( vertex, maxFace );

				}

			}

		}

		return this;

	}

	// computes the extreme vertices of used to compute the initial convex hull

	_computeExtremes() {

		const min = new Vector3( Infinity, Infinity, Infinity );
		const max = new Vector3( - Infinity, - Infinity, - Infinity );

		const minVertices = { x: null, y: null, z: null };
		const maxVertices = { x: null, y: null, z: null };

		// compute the min/max points on all six directions

		for ( let i = 0, l = this._vertices.length; i < l; i ++ ) {

			const vertex = this._vertices[ i ];
			const point = vertex.point;

			// update the min coordinates

			if ( point.x < min.x ) {

				min.x = point.x;
				minVertices.x = vertex;

			}

			if ( point.y < min.y ) {

				min.y = point.y;
				minVertices.y = vertex;

			}

			if ( point.z < min.z ) {

				min.z = point.z;
				minVertices.z = vertex;

			}

			// update the max coordinates

			if ( point.x > max.x ) {

				max.x = point.x;
				maxVertices.x = vertex;

			}

			if ( point.y > max.y ) {

				max.y = point.y;
				maxVertices.y = vertex;

			}

			if ( point.z > max.z ) {

				max.z = point.z;
				maxVertices.z = vertex;

			}

		}

		// use min/max vectors to compute an optimal epsilon

		this._tolerance = 3 * Number.EPSILON * (
			Math.max( Math.abs( min.x ), Math.abs( max.x ) ) +
			Math.max( Math.abs( min.y ), Math.abs( max.y ) ) +
			Math.max( Math.abs( min.z ), Math.abs( max.z ) )
		);

		return { min: minVertices, max: maxVertices };

	}

	// computes the horizon, an array of edges enclosing the faces that are able
	// to see the new vertex

	_computeHorizon( eyePoint, crossEdge, face, horizon ) {

		if ( face.outside ) {

			const startVertex = face.outside;

			// remove all vertices from the given face

			this._removeAllVerticesFromFace( face );

			// mark the face vertices to be reassigned to other faces

			this._unassigned.appendChain( startVertex );

		}

		face.active = false;

		let edge;

		if ( crossEdge === null ) {

			edge = crossEdge = face.getEdge( 0 );

		} else {

			// start from the next edge since 'crossEdge' was already analyzed
			// (actually 'crossEdge.twin' was the edge who called this method recursively)

			edge = crossEdge.next;

		}

		do {

			let twinEdge = edge.twin;
			let oppositeFace = twinEdge.polygon;

			if ( oppositeFace.active ) {

				if ( oppositeFace.distanceToPoint( eyePoint ) > this._tolerance ) {

					// the opposite face can see the vertex, so proceed with next edge

					this._computeHorizon( eyePoint, twinEdge, oppositeFace, horizon );

				} else {

					// the opposite face can't see the vertex, so this edge is part of the horizon

					horizon.push( edge );

				}

			}

			edge = edge.next;

		} while ( edge !== crossEdge );

		return this;

	}

	// this method controls the basic flow of the algorithm

	_generate() {

		this.faces.length = 0;

		this._computeInitialHull();

		let vertex;

		while ( vertex = this._nextVertexToAdd() ) {

			this._addVertexToHull( vertex );

		}

		this._updateFaces();

		this._mergeFaces();

		this._reset();

		return this;

	}

	// merges faces if the result is still convex and coplanar

	_mergeFaces() {

		const faces = this.faces;
		const edges = this.edges;

		const cache = {
			leftPrev: null,
			leftNext: null,
			rightPrev: null,
			rightNext: null
		};

		// gather unique edges and temporarily sort them

		this.computeUniqueEdges();

		edges.sort( ( a, b ) => b.length() - a.length() );

		// process edges from longest to shortest

		for ( let i = 0, l = edges.length; i < l; i ++ ) {

			const entry = edges[ i ];

			let candidate = entry;

			// cache current references for possible restore

			cache.prev = candidate.prev;
			cache.next = candidate.next;
			cache.prevTwin = candidate.twin.prev;
			cache.nextTwin = candidate.twin.next;

			// temporarily change the first polygon in order to represent both polygons

			candidate.prev.next = candidate.twin.next;
			candidate.next.prev = candidate.twin.prev;
			candidate.twin.prev.next = candidate.next;
			candidate.twin.next.prev = candidate.prev;

			const polygon = candidate.polygon;
			polygon.edge = candidate.prev;

			const ccw = polygon.plane.normal.dot( up ) >= 0;

			if ( polygon.convex( ccw ) === true && polygon.coplanar( this._tolerance ) === true ) {

				// correct polygon reference of all edges

				let edge = polygon.edge;

				do {

					edge.polygon = polygon;

					edge = edge.next;

				} while ( edge !== polygon.edge );

				// delete obsolete polygon

				const index = faces.indexOf( entry.twin.polygon );
				faces.splice( index, 1 );

			} else {

				// restore

				cache.prev.next = candidate;
				cache.next.prev = candidate;
				cache.prevTwin.next = candidate.twin;
				cache.nextTwin.prev = candidate.twin;

				polygon.edge = candidate;

			}

		}

		// recompute centroid of faces

		for ( let i = 0, l = faces.length; i < l; i ++ ) {

			faces[ i ].computeCentroid();

		}

		// compute centroid of convex hull and the final edge and vertex list

		this.computeCentroid();
		this.computeUniqueEdges();
		this.computeUniqueVertices();

		return this;

	}

	// determines the next vertex that should added to the convex hull

	_nextVertexToAdd() {

		let nextVertex = null;

		// if the 'assigned' list of vertices is empty, no vertices are left

		if ( this._assigned.empty() === false ) {

			let maxDistance = 0;

			// grap the first available vertex and save the respective face

			let vertex = this._assigned.first();
			const face = vertex.face;

			// now calculate the farthest vertex that face can see

			do {

				const distance = face.distanceToPoint( vertex.point );

				if ( distance > maxDistance ) {

					maxDistance = distance;
					nextVertex = vertex;

				}

				vertex = vertex.next;

			} while ( vertex !== null && vertex.face === face );

		}

		return nextVertex;

	}

	// updates the faces array after the computation of the convex hull
	// it ensures only visible faces are in the result set

	_updateFaces() {

		const faces = this.faces;
		const activeFaces = new Array();

		for ( let i = 0, l = faces.length; i < l; i ++ ) {

			const face = faces[ i ];

			// only respect visible but not deleted or merged faces

			if ( face.active ) {

				activeFaces.push( face );

			}

		}

		this.faces.length = 0;
		this.faces.push( ...activeFaces );

		return this;

	}

	// removes all vertices from the given face. necessary when deleting a face
	// which is necessary when the hull is going to be expanded

	_removeAllVerticesFromFace( face ) {

		if ( face.outside !== null ) {

			// reference to the first and last vertex of this face

			const firstVertex = face.outside;
			firstVertex.face = null;

			let lastVertex = face.outside;

			while ( lastVertex.next !== null && lastVertex.next.face === face ) {

				lastVertex = lastVertex.next;
				lastVertex.face = null;

			}

			face.outside = null;

			this._assigned.removeChain( firstVertex, lastVertex );

		}

		return this;

	}

	// removes a single vertex from the given face

	_removeVertexFromFace( vertex, face ) {

		vertex.face = null;

		if ( vertex === face.outside ) {

			// fix face.outside link

			if ( vertex.next !== null && vertex.next.face === face ) {

				// face has at least 2 outside vertices, move the 'outside' reference

				face.outside = vertex.next;

			} else {

				// vertex was the only outside vertex that face had

				face.outside = null;

			}

		}

		this._assigned.remove( vertex );

		return this;

	}

	// ensure that all unassigned points are reassigned to other faces of the
	// current convex hull. this method is always executed after the hull was
	// expanded

	_resolveUnassignedPoints( newFaces ) {

		if ( this._unassigned.empty() === false ) {

			let vertex = this._unassigned.first();

			do {

				// buffer 'next' reference since addVertexToFace() can change it

				let nextVertex = vertex.next;
				let maxDistance = this._tolerance;

				let maxFace = null;

				for ( let i = 0, l = newFaces.length; i < l; i ++ ) {

					const face = newFaces[ i ];

					if ( face.active ) {

						const distance = face.distanceToPoint( vertex.point );

						if ( distance > maxDistance ) {

							maxDistance = distance;
							maxFace = face;

						}

					}

				}

				if ( maxFace !== null ) {

					this._addVertexToFace( vertex, maxFace );

				}

				vertex = nextVertex;

			} while ( vertex !== null );

		}

		return this;

	}

}

class Face extends Polygon {

	constructor( a = new Vector3(), b = new Vector3(), c = new Vector3() ) {

		super();

		this.outside = null; // reference to a vertex in a vertex list this face can see
		this.active = true;

		this.fromContour( [ a, b, c ] );

		this.computeCentroid();

	}

	getEdge( i ) {

		let edge = this.edge;

		while ( i > 0 ) {

			edge = edge.next;
			i --;

		}

		while ( i < 0 ) {

			edge = edge.prev;
			i ++;

		}

		return edge;

	}

}

// special data structures for the quick hull implementation

class Vertex {

	constructor( point = new Vector3() ) {

		this.point = point;
		this.prev = null;
		this.next = null;
		this.face = null; // the face that is able to see this vertex

	}

}

class VertexList {

	constructor() {

		this.head = null;
		this.tail = null;

	}

	first() {

		return this.head;

	}

	last() {

		return this.tail;

	}

	clear() {

		this.head = this.tail = null;

		return this;

	}

	insertAfter( target, vertex ) {

		vertex.prev = target;
		vertex.next = target.next;

		if ( ! vertex.next ) {

			this.tail = vertex;

		} else {

			vertex.next.prev = vertex;

		}

		target.next = vertex;

		return this;

	}

	append( vertex ) {

		if ( this.head === null ) {

			this.head = vertex;

		} else {

			this.tail.next = vertex;

		}

		vertex.prev = this.tail;
		vertex.next = null; // the tail has no subsequent vertex

		this.tail = vertex;

		return this;

	}

	appendChain( vertex ) {

		if ( this.head === null ) {

			this.head = vertex;

		} else {

			this.tail.next = vertex;

		}

		vertex.prev = this.tail;

		while ( vertex.next !== null ) {

			vertex = vertex.next;

		}

		this.tail = vertex;

		return this;

	}

	remove( vertex ) {

		if ( vertex.prev === null ) {

			this.head = vertex.next;

		} else {

			vertex.prev.next = vertex.next;

		}

		if ( vertex.next === null ) {

			this.tail = vertex.prev;

		} else {

			vertex.next.prev = vertex.prev;

		}

		vertex.prev = null;
		vertex.next = null;

		return this;

	}

	removeChain( a, b ) {

		if ( a.prev === null ) {

			this.head = b.next;

		} else {

			a.prev.next = b.next;

		}

		if ( b.next === null ) {

			this.tail = a.prev;

		} else {

			b.next.prev = a.prev;

		}

		a.prev = null;
		b.next = null;

		return this;

	}

	empty() {

		return this.head === null;

	}

}

const eigenDecomposition = {
	unitary: new Matrix3(),
	diagonal: new Matrix3()
};

const a = {
	c: null, // center
	u: [ new Vector3(), new Vector3(), new Vector3() ], // basis vectors
	e: [] // half width
};

const b = {
	c: null, // center
	u: [ new Vector3(), new Vector3(), new Vector3() ], // basis vectors
	e: [] // half width
};

const R = [[], [], []];
const AbsR = [[], [], []];
const t = [];

const xAxis$1 = new Vector3();
const yAxis$1 = new Vector3();
const zAxis$1 = new Vector3();
const v1$4 = new Vector3();
const closestPoint$1 = new Vector3();

/**
* Class representing an oriented bounding box (OBB). Similar to an AABB, it's a
* rectangular block but with an arbitrary orientation. When using {@link OBB#fromPoints},
* the implementation tries to provide a tight-fitting oriented bounding box. In
* many cases, the result is better than an AABB or bounding sphere but worse than a
* convex hull. However, it's more efficient to work with OBBs compared to convex hulls.
* In general, OBB's are a good compromise between performance and tightness.
*
* @author {@link https://github.com/Mugen87|Mugen87}
*/
class OBB {

	/**
	* Constructs a new OBB with the given values.
	*
	* @param {Vector3} center - The center of this OBB.
	* @param {Vector3} halfSizes - The half sizes of the OBB (defines its width, height and depth).
	* @param {Quaternion} rotation - The rotation of this OBB.
	*/
	constructor( center = new Vector3(), halfSizes = new Vector3(), rotation = new Matrix3() ) {

		/**
		* The center of this OBB.
		* @type Vector3
		*/
		this.center = center;

		/**
		* The half sizes of the OBB (defines its width, height and depth).
		* @type Vector3
		*/
		this.halfSizes = halfSizes;

		/**
		* The rotation of this OBB.
		* @type Matrix3
		*/
		this.rotation = rotation;

	}

	/**
	* Sets the given values to this OBB.
	*
	* @param {Vector3} center - The center of this OBB
	* @param {Vector3} halfSizes - The half sizes of the OBB (defines its width, height and depth).
	* @param {Quaternion} rotation - The rotation of this OBB.
	* @return {OBB} A reference to this OBB.
	*/
	set( center, halfSizes, rotation ) {

		this.center = center;
		this.halfSizes = halfSizes;
		this.rotation = rotation;

		return this;

	}

	/**
	* Copies all values from the given OBB to this OBB.
	*
	* @param {OBB} obb - The OBB to copy.
	* @return {OBB} A reference to this OBB.
	*/
	copy( obb ) {

		this.center.copy( obb.center );
		this.halfSizes.copy( obb.halfSizes );
		this.rotation.copy( obb.rotation );

		return this;

	}

	/**
	* Creates a new OBB and copies all values from this OBB.
	*
	* @return {OBB} A new OBB.
	*/
	clone() {

		return new this.constructor().copy( this );

	}

	/**
	* Computes the size (width, height, depth) of this OBB and stores it into the given vector.
	*
	* @param {Vector3} result - The result vector.
	* @return {Vector3} The result vector.
	*/
	getSize( result ) {

		return result.copy( this.halfSizes ).multiplyScalar( 2 );

	}

	/**
	* Ensures the given point is inside this OBB and stores
	* the result in the given vector.
	*
	* Reference: Closest Point on OBB to Point in Real-Time Collision Detection
	* by Christer Ericson (chapter 5.1.4)
	*
	* @param {Vector3} point - A point in 3D space.
	* @param {Vector3} result - The result vector.
	* @return {Vector3} The result vector.
	*/
	clampPoint( point, result ) {

		const halfSizes = this.halfSizes;

		v1$4.subVectors( point, this.center );
		this.rotation.extractBasis( xAxis$1, yAxis$1, zAxis$1 );

		// start at the center position of the OBB

		result.copy( this.center );

		// project the target onto the OBB axes and walk towards that point

		const x = MathUtils.clamp( v1$4.dot( xAxis$1 ), - halfSizes.x, halfSizes.x );
		result.add( xAxis$1.multiplyScalar( x ) );

		const y = MathUtils.clamp( v1$4.dot( yAxis$1 ), - halfSizes.y, halfSizes.y );
		result.add( yAxis$1.multiplyScalar( y ) );

		const z = MathUtils.clamp( v1$4.dot( zAxis$1 ), - halfSizes.z, halfSizes.z );
		result.add( zAxis$1.multiplyScalar( z ) );

		return result;

	}

	/**
	* Returns true if the given point is inside this OBB.
	*
	* @param {Vector3} point - A point in 3D space.
	* @return {Boolean} Whether the given point is inside this OBB or not.
	*/
	containsPoint( point ) {

		v1$4.subVectors( point, this.center );
		this.rotation.extractBasis( xAxis$1, yAxis$1, zAxis$1 );

		// project v1 onto each axis and check if these points lie inside the OBB

		return Math.abs( v1$4.dot( xAxis$1 ) ) <= this.halfSizes.x &&
				Math.abs( v1$4.dot( yAxis$1 ) ) <= this.halfSizes.y &&
				Math.abs( v1$4.dot( zAxis$1 ) ) <= this.halfSizes.z;

	}

	/**
	* Returns true if the given AABB intersects this OBB.
	*
	* @param {AABB} aabb - The AABB to test.
	* @return {Boolean} The result of the intersection test.
	*/
	intersectsAABB( aabb ) {

		return this.intersectsOBB( obb.fromAABB( aabb ) );

	}

	/**
	* Returns true if the given bounding sphere intersects this OBB.
	*
	* @param {BoundingSphere} sphere - The bounding sphere to test.
	* @return {Boolean} The result of the intersection test.
	*/
	intersectsBoundingSphere( sphere ) {

		// find the point on the OBB closest to the sphere center

		this.clampPoint( sphere.center, closestPoint$1 );

		// if that point is inside the sphere, the OBB and sphere intersect

		return closestPoint$1.squaredDistanceTo( sphere.center ) <= ( sphere.radius * sphere.radius );

	}

	/**
	* Returns true if the given OBB intersects this OBB.
	*
	* Reference: OBB-OBB Intersection in Real-Time Collision Detection
	* by Christer Ericson (chapter 4.4.1)
	*
	* @param {OBB} obb - The OBB to test.
	* @param {Number} epsilon - The epsilon (tolerance) value.
	* @return {Boolean} The result of the intersection test.
	*/
	intersectsOBB( obb, epsilon = Number.EPSILON ) {

		// prepare data structures (the code uses the same nomenclature like the reference)

		a.c = this.center;
		a.e[ 0 ] = this.halfSizes.x;
		a.e[ 1 ] = this.halfSizes.y;
		a.e[ 2 ] = this.halfSizes.z;
		this.rotation.extractBasis( a.u[ 0 ], a.u[ 1 ], a.u[ 2 ] );

		b.c = obb.center;
		b.e[ 0 ] = obb.halfSizes.x;
		b.e[ 1 ] = obb.halfSizes.y;
		b.e[ 2 ] = obb.halfSizes.z;
		obb.rotation.extractBasis( b.u[ 0 ], b.u[ 1 ], b.u[ 2 ] );

		// compute rotation matrix expressing b in a’s coordinate frame

		for ( let i = 0; i < 3; i ++ ) {

			for ( let j = 0; j < 3; j ++ ) {

				R[ i ][ j ] = a.u[ i ].dot( b.u[ j ] );

			}

		}

		// compute translation vector

		v1$4.subVectors( b.c, a.c );

		// bring translation into a’s coordinate frame

		t[ 0 ] = v1$4.dot( a.u[ 0 ] );
		t[ 1 ] = v1$4.dot( a.u[ 1 ] );
		t[ 2 ] = v1$4.dot( a.u[ 2 ] );

		// compute common subexpressions. Add in an epsilon term to
		// counteract arithmetic errors when two edges are parallel and
		// their cross product is (near) null

		for ( let i = 0; i < 3; i ++ ) {

			for ( let j = 0; j < 3; j ++ ) {

				AbsR[ i ][ j ] = Math.abs( R[ i ][ j ] ) + epsilon;

			}

		}

		let ra, rb;

		// test axes L = A0, L = A1, L = A2

		for ( let i = 0; i < 3; i ++ ) {

			ra = a.e[ i ];
			rb = b.e[ 0 ] * AbsR[ i ][ 0 ] + b.e[ 1 ] * AbsR[ i ][ 1 ] + b.e[ 2 ] * AbsR[ i ][ 2 ];
			if ( Math.abs( t[ i ] ) > ra + rb ) return false;


		}

		// test axes L = B0, L = B1, L = B2

		for ( let i = 0; i < 3; i ++ ) {

			ra = a.e[ 0 ] * AbsR[ 0 ][ i ] + a.e[ 1 ] * AbsR[ 1 ][ i ] + a.e[ 2 ] * AbsR[ 2 ][ i ];
			rb = b.e[ i ];
			if ( Math.abs( t[ 0 ] * R[ 0 ][ i ] + t[ 1 ] * R[ 1 ][ i ] + t[ 2 ] * R[ 2 ][ i ] ) > ra + rb ) return false;

		}

		// test axis L = A0 x B0

		ra = a.e[ 1 ] * AbsR[ 2 ][ 0 ] + a.e[ 2 ] * AbsR[ 1 ][ 0 ];
		rb = b.e[ 1 ] * AbsR[ 0 ][ 2 ] + b.e[ 2 ] * AbsR[ 0 ][ 1 ];
		if ( Math.abs( t[ 2 ] * R[ 1 ][ 0 ] - t[ 1 ] * R[ 2 ][ 0 ] ) > ra + rb ) return false;

		// test axis L = A0 x B1

		ra = a.e[ 1 ] * AbsR[ 2 ][ 1 ] + a.e[ 2 ] * AbsR[ 1 ][ 1 ];
		rb = b.e[ 0 ] * AbsR[ 0 ][ 2 ] + b.e[ 2 ] * AbsR[ 0 ][ 0 ];
		if ( Math.abs( t[ 2 ] * R[ 1 ][ 1 ] - t[ 1 ] * R[ 2 ][ 1 ] ) > ra + rb ) return false;

		// test axis L = A0 x B2

		ra = a.e[ 1 ] * AbsR[ 2 ][ 2 ] + a.e[ 2 ] * AbsR[ 1 ][ 2 ];
		rb = b.e[ 0 ] * AbsR[ 0 ][ 1 ] + b.e[ 1 ] * AbsR[ 0 ][ 0 ];
		if ( Math.abs( t[ 2 ] * R[ 1 ][ 2 ] - t[ 1 ] * R[ 2 ][ 2 ] ) > ra + rb ) return false;

		// test axis L = A1 x B0

		ra = a.e[ 0 ] * AbsR[ 2 ][ 0 ] + a.e[ 2 ] * AbsR[ 0 ][ 0 ];
		rb = b.e[ 1 ] * AbsR[ 1 ][ 2 ] + b.e[ 2 ] * AbsR[ 1 ][ 1 ];
		if ( Math.abs( t[ 0 ] * R[ 2 ][ 0 ] - t[ 2 ] * R[ 0 ][ 0 ] ) > ra + rb ) return false;

		// test axis L = A1 x B1

		ra = a.e[ 0 ] * AbsR[ 2 ][ 1 ] + a.e[ 2 ] * AbsR[ 0 ][ 1 ];
		rb = b.e[ 0 ] * AbsR[ 1 ][ 2 ] + b.e[ 2 ] * AbsR[ 1 ][ 0 ];
		if ( Math.abs( t[ 0 ] * R[ 2 ][ 1 ] - t[ 2 ] * R[ 0 ][ 1 ] ) > ra + rb ) return false;

		// test axis L = A1 x B2

		ra = a.e[ 0 ] * AbsR[ 2 ][ 2 ] + a.e[ 2 ] * AbsR[ 0 ][ 2 ];
		rb = b.e[ 0 ] * AbsR[ 1 ][ 1 ] + b.e[ 1 ] * AbsR[ 1 ][ 0 ];
		if ( Math.abs( t[ 0 ] * R[ 2 ][ 2 ] - t[ 2 ] * R[ 0 ][ 2 ] ) > ra + rb ) return false;

		// test axis L = A2 x B0

		ra = a.e[ 0 ] * AbsR[ 1 ][ 0 ] + a.e[ 1 ] * AbsR[ 0 ][ 0 ];
		rb = b.e[ 1 ] * AbsR[ 2 ][ 2 ] + b.e[ 2 ] * AbsR[ 2 ][ 1 ];
		if ( Math.abs( t[ 1 ] * R[ 0 ][ 0 ] - t[ 0 ] * R[ 1 ][ 0 ] ) > ra + rb ) return false;

		// test axis L = A2 x B1

		ra = a.e[ 0 ] * AbsR[ 1 ][ 1 ] + a.e[ 1 ] * AbsR[ 0 ][ 1 ];
		rb = b.e[ 0 ] * AbsR[ 2 ][ 2 ] + b.e[ 2 ] * AbsR[ 2 ][ 0 ];
		if ( Math.abs( t[ 1 ] * R[ 0 ][ 1 ] - t[ 0 ] * R[ 1 ][ 1 ] ) > ra + rb ) return false;

		// test axis L = A2 x B2

		ra = a.e[ 0 ] * AbsR[ 1 ][ 2 ] + a.e[ 1 ] * AbsR[ 0 ][ 2 ];
		rb = b.e[ 0 ] * AbsR[ 2 ][ 1 ] + b.e[ 1 ] * AbsR[ 2 ][ 0 ];
		if ( Math.abs( t[ 1 ] * R[ 0 ][ 2 ] - t[ 0 ] * R[ 1 ][ 2 ] ) > ra + rb ) return false;

		// since no separating axis is found, the OBBs must be intersecting

		return true;

	}

	/**
	* Returns true if the given plane intersects this OBB.
	*
	* Reference: Testing Box Against Plane in Real-Time Collision Detection
	* by Christer Ericson (chapter 5.2.3)
	*
	* @param {Plane} plane - The plane to test.
	* @return {Boolean} The result of the intersection test.
	*/
	intersectsPlane( plane ) {

		this.rotation.extractBasis( xAxis$1, yAxis$1, zAxis$1 );

		// compute the projection interval radius of this OBB onto L(t) = this->center + t * p.normal;

		const r = this.halfSizes.x * Math.abs( plane.normal.dot( xAxis$1 ) ) +
				this.halfSizes.y * Math.abs( plane.normal.dot( yAxis$1 ) ) +
				this.halfSizes.z * Math.abs( plane.normal.dot( zAxis$1 ) );

		// compute distance of the OBB's center from the plane

		const d = plane.normal.dot( this.center ) - plane.constant;

		// Intersection occurs when distance d falls within [-r,+r] interval

		return Math.abs( d ) <= r;

	}

	/**
	* Computes the OBB from an AABB.
	*
	* @param {AABB} aabb - The AABB.
	* @return {OBB} A reference to this OBB.
	*/
	fromAABB( aabb ) {

		aabb.getCenter( this.center );

		aabb.getSize( this.halfSizes ).multiplyScalar( 0.5 );

		this.rotation.identity();

		return this;

	}

	/**
	* Computes the minimum enclosing OBB for the given set of points. The method is an
	* implementation of {@link http://gamma.cs.unc.edu/users/gottschalk/main.pdf Collision Queries using Oriented Bounding Boxes}
	* by Stefan Gottschalk.
	* According to the dissertation, the quality of the fitting process varies from
	* the respective input. This method uses the best approach by computing the
	* covariance matrix based on the triangles of the convex hull (chapter 3.4.3).
	*
	* However, the implementation is susceptible to {@link https://en.wikipedia.org/wiki/Regular_polygon regular polygons}
	* like cubes or spheres. For such shapes, it's recommended to verify the quality
	* of the produced OBB. Consider to use an AABB or bounding sphere if the result
	* is not satisfying.
	*
	* @param {Array} points - An array of 3D vectors representing points in 3D space.
	* @return {OBB} A reference to this OBB.
	*/
	fromPoints( points ) {

		const convexHull = new ConvexHull().fromPoints( points );

		// 1. iterate over all faces of the convex hull and triangulate

		const faces = convexHull.faces;
		const edges = new Array();
		const triangles = new Array();

		for ( let i = 0, il = faces.length; i < il; i ++ ) {

			const face = faces[ i ];
			let edge = face.edge;

			edges.length = 0;

			// gather edges

			do {

				edges.push( edge );

				edge = edge.next;

			} while ( edge !== face.edge );

			// triangulate

			const triangleCount = ( edges.length - 2 );

			for ( let j = 1, jl = triangleCount; j <= jl; j ++ ) {

				const v1 = edges[ 0 ].vertex;
				const v2 = edges[ j + 0 ].vertex;
				const v3 = edges[ j + 1 ].vertex;

				triangles.push( v1.x, v1.y, v1.z );
				triangles.push( v2.x, v2.y, v2.z );
				triangles.push( v3.x, v3.y, v3.z );

			}

		}

		// 2. build covariance matrix

		const p = new Vector3();
		const q = new Vector3();
		const r = new Vector3();

		const qp = new Vector3();
		const rp = new Vector3();

		const v = new Vector3();

		const mean = new Vector3();
		const weightedMean = new Vector3();
		let areaSum = 0;

		let cxx, cxy, cxz, cyy, cyz, czz;
		cxx = cxy = cxz = cyy = cyz = czz = 0;

		for ( let i = 0, l = triangles.length; i < l; i += 9 ) {

			p.fromArray( triangles, i );
			q.fromArray( triangles, i + 3 );
			r.fromArray( triangles, i + 6 );

			mean.set( 0, 0, 0 );
			mean.add( p ).add( q ).add( r ).divideScalar( 3 );

			qp.subVectors( q, p );
			rp.subVectors( r, p );

			const area = v.crossVectors( qp, rp ).length() / 2; // .length() represents the frobenius norm here
			weightedMean.add( v.copy( mean ).multiplyScalar( area ) );

			areaSum += area;

			cxx += ( 9.0 * mean.x * mean.x + p.x * p.x + q.x * q.x + r.x * r.x ) * ( area / 12 );
			cxy += ( 9.0 * mean.x * mean.y + p.x * p.y + q.x * q.y + r.x * r.y ) * ( area / 12 );
			cxz += ( 9.0 * mean.x * mean.z + p.x * p.z + q.x * q.z + r.x * r.z ) * ( area / 12 );
			cyy += ( 9.0 * mean.y * mean.y + p.y * p.y + q.y * q.y + r.y * r.y ) * ( area / 12 );
			cyz += ( 9.0 * mean.y * mean.z + p.y * p.z + q.y * q.z + r.y * r.z ) * ( area / 12 );
			czz += ( 9.0 * mean.z * mean.z + p.z * p.z + q.z * q.z + r.z * r.z ) * ( area / 12 );

		}

		weightedMean.divideScalar( areaSum );

		cxx /= areaSum;
		cxy /= areaSum;
		cxz /= areaSum;
		cyy /= areaSum;
		cyz /= areaSum;
		czz /= areaSum;

		cxx -= weightedMean.x * weightedMean.x;
		cxy -= weightedMean.x * weightedMean.y;
		cxz -= weightedMean.x * weightedMean.z;
		cyy -= weightedMean.y * weightedMean.y;
		cyz -= weightedMean.y * weightedMean.z;
		czz -= weightedMean.z * weightedMean.z;

		const covarianceMatrix = new Matrix3();

		covarianceMatrix.elements[ 0 ] = cxx;
		covarianceMatrix.elements[ 1 ] = cxy;
		covarianceMatrix.elements[ 2 ] = cxz;
		covarianceMatrix.elements[ 3 ] = cxy;
		covarianceMatrix.elements[ 4 ] = cyy;
		covarianceMatrix.elements[ 5 ] = cyz;
		covarianceMatrix.elements[ 6 ] = cxz;
		covarianceMatrix.elements[ 7 ] = cyz;
		covarianceMatrix.elements[ 8 ] = czz;

		// 3. compute rotation, center and half sizes

		covarianceMatrix.eigenDecomposition( eigenDecomposition );

		const unitary = eigenDecomposition.unitary;

		const v1 = new Vector3();
		const v2 = new Vector3();
		const v3 = new Vector3();

		unitary.extractBasis( v1, v2, v3 );

		let u1 = - Infinity;
		let u2 = - Infinity;
		let u3 = - Infinity;
		let l1 = Infinity;
		let l2 = Infinity;
		let l3 = Infinity;

		for ( let i = 0, l = points.length; i < l; i ++ ) {

			const p = points[ i ];

			u1 = Math.max( v1.dot( p ), u1 );
			u2 = Math.max( v2.dot( p ), u2 );
			u3 = Math.max( v3.dot( p ), u3 );

			l1 = Math.min( v1.dot( p ), l1 );
			l2 = Math.min( v2.dot( p ), l2 );
			l3 = Math.min( v3.dot( p ), l3 );

		}

		v1.multiplyScalar( 0.5 * ( l1 + u1 ) );
		v2.multiplyScalar( 0.5 * ( l2 + u2 ) );
		v3.multiplyScalar( 0.5 * ( l3 + u3 ) );

		// center

		this.center.add( v1 ).add( v2 ).add( v3 );

		this.halfSizes.x = u1 - l1;
		this.halfSizes.y = u2 - l2;
		this.halfSizes.z = u3 - l3;

		// halfSizes

		this.halfSizes.multiplyScalar( 0.5 );

		// rotation

		this.rotation.copy( unitary );

		return this;

	}

	/**
	* Returns true if the given OBB is deep equal with this OBB.
	*
	* @param {OBB} aabb - The OBB to test.
	* @return {Boolean} The result of the equality test.
	*/
	equals( obb ) {

		return obb.center.equals( this.center ) &&
				obb.halfSizes.equals( this.halfSizes ) &&
				obb.rotation.equals( this.rotation );

	}

	/**
	* Transforms this instance into a JSON object.
	*
	* @return {Object} The JSON object.
	*/
	toJSON() {

		return {
			type: this.constructor.name,
			center: this.center.toArray( new Array() ),
			halfSizes: this.halfSizes.toArray( new Array() ),
			rotation: this.rotation.toArray( new Array() )
		};

	}

	/**
	* Restores this instance from the given JSON object.
	*
	* @param {Object} json - The JSON object.
	* @return {OBB} A reference to this OBB.
	*/
	fromJSON( json ) {

		this.center.fromArray( json.center );
		this.halfSizes.fromArray( json.halfSizes );
		this.rotation.fromArray( json.rotation );

		return this;

	}

}

const obb = new OBB();

/**
* Class for representing navigation edges.
*
* @author {@link https://github.com/Mugen87|Mugen87}
* @augments Edge
*/
class NavEdge extends Edge {

	/**
	* Constructs a navigation edge.
	*
	* @param {Number} from - The index of the from node.
	* @param {Number} to - The index of the to node.
	* @param {Number} cost - The cost of this edge.
	*/
	constructor( from = - 1, to = - 1, cost = 0 ) {

		super( from, to, cost );

	}

}

/**
* Class for representing navigation nodes.
*
* @author {@link https://github.com/Mugen87|Mugen87}
* @augments Node
*/
class NavNode extends Node {

	/**
	* Constructs a new navigation node.
	*
	* @param {Number} index - The unique index of this node.
	* @param {Vector3} position - The position of the node in 3D space.
	* @param {Object} userData - Custom user data connected to this node.
	*/
	constructor( index = - 1, position = new Vector3(), userData = {} ) {

		super( index );

		/**
		* The position of the node in 3D space.
		* @type Vector3
		*/
		this.position = position;

		/**
		* Custom user data connected to this node.
		* @type Object
		*/
		this.userData = userData;

	}

}

/**
* Class with graph helpers.
*
* @author {@link https://github.com/Mugen87|Mugen87}
*/
class GraphUtils {

	/**
	* Generates a navigation graph with a planar grid layout based on the given parameters.
	*
	* @param {Number} size - The size (width and depth) in x and z direction
	* @param {Number} segments - The amount of segments in x and z direction.
	* @return {Graph} The new graph.
	*/
	static createGridLayout( size, segments ) {

		const graph = new Graph();
		graph.digraph = true;

		const halfSize = size / 2;
		const segmentSize = size / segments;

		// nodes

		let index = 0;

		for ( let i = 0; i <= segments; i ++ ) {

			const z = ( i * segmentSize ) - halfSize;

			for ( let j = 0; j <= segments; j ++ ) {

				const x = ( j * segmentSize ) - halfSize;

				const position = new Vector3( x, 0, z );

				const node = new NavNode( index, position );

				graph.addNode( node );

				index ++;

			}

		}

		// edges

		const count = graph.getNodeCount();
		const range = Math.pow( segmentSize + ( segmentSize / 2 ), 2 );

		for ( let i = 0; i < count; i ++ ) {

			const node = graph.getNode( i );

			// check distance to all other nodes

			for ( let j = 0; j < count; j ++ ) {

				if ( i !== j ) {

					const neighbor = graph.getNode( j );

					const distanceSquared = neighbor.position.squaredDistanceTo( node.position );

					if ( distanceSquared <= range ) {

						const distance = Math.sqrt( distanceSquared );

						const edge = new NavEdge( i, j, distance );

						graph.addEdge( edge );

					}

				}

			}

		}

		return graph;

	}

}

/**
* A corridor is a sequence of portal edges representing a walkable way within a navigation mesh. The class is able
* to find the shortest path through this corridor as a sequence of waypoints. It's an implementation of the so called
* {@link http://digestingduck.blogspot.com/2010/03/simple-stupid-funnel-algorithm.html Funnel Algorithm}. Read
* the paper {@link https://aaai.org/Papers/AAAI/2006/AAAI06-148.pdf Efficient Triangulation-Based Pathfinding} for
* more detailed information.
*
* @author {@link https://github.com/Mugen87|Mugen87}
* @author {@link https://github.com/robp94|robp94}
*/
class Corridor {

	/**
	* Creates a new corridor.
	*/
	constructor() {

		/**
		* The portal edges of the corridor.
		* @type Array
		*/
		this.portalEdges = new Array();

	}

	/**
	* Adds a portal edge defined by its left and right vertex to this corridor.
	*
	* @param {Vector3} left - The left point (origin) of the portal edge.
	* @param {Vector3} right - The right point (destination) of the portal edge.
	* @return {Corridor} A reference to this corridor.
	*/
	push( left, right ) {

		this.portalEdges.push( {
			left: left,
			right: right
		} );

		return this;

	}

	/**
	* Generates the shortest path through the corridor as an array of 3D vectors.
	*
	* @return {Array} An array of 3D waypoints.
	*/
	generate() {

		const portalEdges = this.portalEdges;
		const path = new Array();

		// init scan state

		let portalApex, portalLeft, portalRight;
		let apexIndex = 0, leftIndex = 0, rightIndex = 0;

		portalApex = portalEdges[ 0 ].left;
		portalLeft = portalEdges[ 0 ].left;
		portalRight = portalEdges[ 0 ].right;

		// add start point

		path.push( portalApex );

		for ( let i = 1, l = portalEdges.length; i < l; i ++ ) {

			const left = portalEdges[ i ].left;
			const right = portalEdges[ i ].right;

			// update right vertex

			if ( MathUtils.area( portalApex, portalRight, right ) <= 0 ) {

				if ( portalApex === portalRight || MathUtils.area( portalApex, portalLeft, right ) > 0 ) {

					// tighten the funnel

					portalRight = right;
					rightIndex = i;

				} else {

					// right over left, insert left to path and restart scan from portal left point

					path.push( portalLeft );

					// make current left the new apex

					portalApex = portalLeft;
					apexIndex = leftIndex;

					// review eset portal

					portalLeft = portalApex;
					portalRight = portalApex;
					leftIndex = apexIndex;
					rightIndex = apexIndex;

					// restart scan

					i = apexIndex;

					continue;

				}

			}

			// update left vertex

			if ( MathUtils.area( portalApex, portalLeft, left ) >= 0 ) {

				if ( portalApex === portalLeft || MathUtils.area( portalApex, portalRight, left ) < 0 ) {

					// tighten the funnel

					portalLeft = left;
					leftIndex = i;

				} else {

					// left over right, insert right to path and restart scan from portal right point

					path.push( portalRight );

					// make current right the new apex

					portalApex = portalRight;
					apexIndex = rightIndex;

					// reset portal

					portalLeft = portalApex;
					portalRight = portalApex;
					leftIndex = apexIndex;
					rightIndex = apexIndex;

					// restart scan

					i = apexIndex;

					continue;

				}

			}

		}

		if ( ( path.length === 0 ) || ( path[ path.length - 1 ] !== portalEdges[ portalEdges.length - 1 ].left ) ) {

			// append last point to path

			path.push( portalEdges[ portalEdges.length - 1 ].left );

		}

		return path;

	}

}

/**
* A lookup table representing the cost associated from traveling from one
* node to every other node in the navgiation mesh's graph.
*
* @author {@link https://github.com/Mugen87|Mugen87}
*/
class CostTable {

	/**
	* Creates a new cost table.
	*/
	constructor() {

		this._nodeMap = new Map();

	}

	/**
	* Inits the cost table for the given navigation mesh.
	*
	* @param {NavMesh} navMesh - The navigation mesh.
	* @return {CostTable} A reference to this cost table.
	*/
	init( navMesh ) {

		const graph = navMesh.graph;
		const nodes = new Array();

		this.clear();

		// iterate over all nodes

		graph.getNodes( nodes );

		for ( let i = 0, il = nodes.length; i < il; i ++ ) {

			const from = nodes[ i ];

			// compute the distance to all other nodes

			for ( let j = 0, jl = nodes.length; j < jl; j ++ ) {

				const to = nodes[ j ];

				const path = navMesh.findPath( from.position, to.position );
				const cost = computeDistanceOfPath( path );

				this.set( from.index, to.index, cost );

			}

		}

		return this;

	}

	/**
	* Clears the cost table.
	*
	* @return {CostTable} A reference to this cost table.
	*/
	clear() {

		this._nodeMap.clear();

		return this;

	}

	/**
	* Sets the cost for the given pair of navigation nodes.
	*
	* @param {Number} from - The start node index.
	* @param {Number} to - The destintation node index.
	* @param {Number} cost - The cost.
	* @return {CostTable} A reference to this cost table.
	*/
	set( from, to, cost ) {

		const nodeMap = this._nodeMap;

		if ( nodeMap.has( from ) === false ) nodeMap.set( from, new Map() );

		const nodeCostMap = nodeMap.get( from );

		nodeCostMap.set( to, cost );

		return this;

	}

	/**
	* Returns the cost for the given pair of navigation nodes.
	*
	* @param {Number} from - The start node index.
	* @param {Number} to - The destintation node index.
	* @return {Number} The cost.
	*/
	get( from, to ) {

		const nodeCostMap = this._nodeMap.get( from );

		return nodeCostMap.get( to );

	}

	/**
	* Returns the size of the cost table (amount of entries).
	*
	* @return {Number} The size of the cost table.
	*/
	size() {

		return this._nodeMap.size;

	}

	/**
	* Transforms this instance into a JSON object.
	*
	* @return {Object} The JSON object.
	*/
	toJSON() {

		const json = {
			nodes: new Array()
		};

		for ( let [ key, value ] of this._nodeMap.entries() ) {

			json.nodes.push( { index: key, costs: Array.from( value ) } );

		}

		return json;

	}

	/**
	* Restores this instance from the given JSON object.
	*
	* @param {Object} json - The JSON object.
	* @return {CostTable} A reference to this cost table.
	*/
	fromJSON( json ) {

		const nodes = json.nodes;

		for ( let i = 0, l = nodes.length; i < l; i ++ ) {

			const node = nodes[ i ];

			const index = node.index;
			const costs = new Map( node.costs );

			this._nodeMap.set( index, costs );

		}

		return this;

	}

}

//

function computeDistanceOfPath( path ) {

	let distance = 0;

	for ( let i = 0, l = ( path.length - 1 ); i < l; i ++ ) {

		const from = path[ i ];
		const to = path[ i + 1 ];

		distance += from.distanceTo( to );

	}

	return distance;

}

const pointOnLineSegment = new Vector3();
const edgeDirection = new Vector3();
const movementDirection = new Vector3();
const newPosition = new Vector3();
const lineSegment = new LineSegment();
const edges = new Array();
const closestBorderEdge = {
	edge: null,
	closestPoint: new Vector3()
};

/**
* Implementation of a navigation mesh. A navigation mesh is a network of convex polygons
* which define the walkable areas of a game environment. A convex polygon allows unobstructed travel
* from any point in the polygon to any other. This is useful because it enables the navigation mesh
* to be represented using a graph where each node represents a convex polygon and their respective edges
* represent the neighborly relations to other polygons. More compact navigation graphs leads
* to faster graph search execution.
*
* This particular implementation is able to merge convex polygons into bigger ones as long
* as they keep their convexity and coplanarity. The performance of the path finding process and convex region tests
* for complex navigation meshes can be improved by using a spatial index like {@link CellSpacePartitioning}.
*
* @author {@link https://github.com/Mugen87|Mugen87}
* @author {@link https://github.com/robp94|robp94}
*/
class NavMesh {

	/**
	* Constructs a new navigation mesh.
	*/
	constructor() {

		/**
		* The internal navigation graph of this navigation mesh representing neighboring polygons.
		* @type Graph
		*/
		this.graph = new Graph();
		this.graph.digraph = true;

		/**
		 * Whether to merge polygons when constructing regions. Defaults to true.
		 * @type Boolean
		 */
		this.attemptMergePolies = true;

		/**
		 * Whether to build navigation graph via it's own internal method. Defaults to true.
		 * You may set this to false if you intend to manually set up the graph yourself through other methods.
		 * @type Boolean
		 */
		this.attemptBuildGraph = true;

		/**
		* The list of convex regions.
		* @type Array
		*/
		this.regions = new Array();

		/**
		* A reference to a spatial index.
		* @type CellSpacePartitioning
		* @default null
		*/
		this.spatialIndex = null;

		/**
		* The tolerance value for the coplanar test.
		* @type Number
		* @default 1e-3
		*/
		this.epsilonCoplanarTest = 1e-3;

		/**
		* The tolerance value for the containment test.
		* @type Number
		* @default 1
		*/
		this.epsilonContainsTest = 1;

		//

		this._borderEdges = new Array();

	}

	/**
	* Creates the navigation mesh from an array of convex polygons.
	*
	* @param {Array} polygons - An array of convex polygons.
	* @return {NavMesh} A reference to this navigation mesh.
	*/
	fromPolygons( polygons ) {

		this.clear();

		//

		const initialEdgeList = new Array();
		const sortedEdgeList = new Array();

		// setup list with all edges

		for ( let i = 0, l = polygons.length; i < l; i ++ ) {

			const polygon = polygons[ i ];

			let edge = polygon.edge;

			do {

				initialEdgeList.push( edge );

				edge = edge.next;

			} while ( edge !== polygon.edge );

			//

			this.regions.push( polygon );

		}

		// setup twin references and sorted list of edges

		for ( let i = 0, il = initialEdgeList.length; i < il; i ++ ) {

			let edge0 = initialEdgeList[ i ];

			if ( edge0.twin !== null ) continue;

			for ( let j = i + 1, jl = initialEdgeList.length; j < jl; j ++ ) {

				let edge1 = initialEdgeList[ j ];

				if ( edge0.tail().equals( edge1.head() ) && edge0.head().equals( edge1.tail() ) ) {

					// opponent edge found, set twin references

					edge0.linkOpponent( edge1 );

					// add edge to list

					const cost = edge0.squaredLength();

					sortedEdgeList.push( {
						cost: cost,
						edge: edge0
					} );

					// there can only be a single twin

					break;

				}

			}

		}

		sortedEdgeList.sort( descending );

		// half-edge data structure is now complete, begin build of convex regions

		this._buildRegions( sortedEdgeList );

		// now build the navigation graph

		if (this.attemptBuildGraph) this._buildGraph();

		return this;

	}

	/**
	* Clears the internal state of this navigation mesh.
	*
	* @return {NavMesh} A reference to this navigation mesh.
	*/
	clear() {

		this.graph.clear();
		this.regions.length = 0;
		this.spatialIndex = null;

		return this;

	}

	/**
	* Returns the closest convex region for the given point in 3D space.
	*
	* @param {Vector3} point - A point in 3D space.
	* @return {Polygon} The closest convex region.
	*/
	getClosestRegion( point ) {

		const regions = this.regions;
		let closesRegion = null;
		let minDistance = Infinity;

		for ( let i = 0, l = regions.length; i < l; i ++ ) {

			const region = regions[ i ];

			const distance = point.squaredDistanceTo( region.centroid );

			if ( distance < minDistance ) {

				minDistance = distance;

				closesRegion = region;

			}

		}

		return closesRegion;

	}

	/**
	* Returns at random a convex region from the navigation mesh.
	*
	* @return {Polygon} The convex region.
	*/
	getRandomRegion() {

		const regions = this.regions;

		let index = Math.floor( Math.random() * ( regions.length ) );

		if ( index === regions.length ) index = regions.length - 1;

		return regions[ index ];

	}

	/**
	* Returns the region that contains the given point. The computational overhead
	* of this method for complex navigation meshes can be reduced by using a spatial index.
	* If not convex region contains the point, *null* is returned.
	*
	* @param {Vector3} point - A point in 3D space.
	* @param {Number} epsilon - Tolerance value for the containment test.
	* @return {Polygon} The convex region that contains the point.
	*/
	getRegionForPoint( point, epsilon = 1e-3 ) {

		let regions;

		if ( this.spatialIndex !== null ) {

			const index = this.spatialIndex.getIndexForPosition( point );
			regions = this.spatialIndex.cells[ index ];
			if (!regions) return null;
			regions = regions.entries;

		} else {

			regions = this.regions;

		}

		//

		for ( let i = 0, l = regions.length; i < l; i ++ ) {

			const region = regions[ i ];

			if ( region.contains( point, epsilon ) === true ) {

				return region;

			}

		}

		return null;

	}

	/**
	* Returns the node index for the given region. The index represents
	* the navigation node of a region in the navigation graph.
	*
	* @param {Polygon} region - The convex region.
	* @return {Number} The respective node index.
	*/
	getNodeIndex( region ) {

		return this.regions.indexOf( region );

	}


	/**
	* Returns the shortest path that leads from the given start position to the end position.
	* The computational overhead of this method for complex navigation meshes can greatly
	* reduced by using a spatial index.
	*
	* @param {Vector3} from - The start/source position.
	* @param {Vector3} to - The end/destination position.
	* @return {Array} Path of regions. If same region, returns array length 1 same region
	*/
	findPathOfRegions( from, to ) {

		const graph = this.graph;
		const path = new Array();

		let fromRegion = this.getRegionForPoint( from, this.epsilonContainsTest );
		let toRegion = this.getRegionForPoint( to, this.epsilonContainsTest );

		if ( fromRegion === null || toRegion === null ) {

			// if source or target are outside the navmesh, choose the nearest convex region

			if ( fromRegion === null ) fromRegion = this.getClosestRegion( from );
			if ( toRegion === null ) toRegion = this.getClosestRegion( to );

		}

		// check if both convex region are identical

		if ( fromRegion === toRegion ) {

			// no search necessary, directly create the path

			path.push( fromRegion );
			return path;

		} else {

			// source and target are not in same region, perform search

			const source = this.getNodeIndex( fromRegion );
			const target = this.getNodeIndex( toRegion );

			const astar = new AStar( graph, source, target );
			astar.search();

			if ( astar.found === true ) {

				for ( let i = 0, l = ( polygonPath.length ); i < l; i ++ ) {
					path.push( this.regions[ polygonPath[ i ] ] );
				}
			}
			return path;
		}
	}


	/**
	* Returns the shortest path that leads from the given start position to the end position.
	* The computational overhead of this method for complex navigation meshes can greatly
	* reduced by using a spatial index.
	*
	* @param {Vector3} from - The start/source position.
	* @param {Vector3} to - The end/destination position.
	* @return {Array} The shortest path as an array of points.
	*/
	findPath( from, to ) {

		const graph = this.graph;
		const path = new Array();

		let fromRegion = this.getRegionForPoint( from, this.epsilonContainsTest );
		let toRegion = this.getRegionForPoint( to, this.epsilonContainsTest );

		if ( fromRegion === null || toRegion === null ) {

			// if source or target are outside the navmesh, choose the nearest convex region

			if ( fromRegion === null ) fromRegion = this.getClosestRegion( from );
			if ( toRegion === null ) toRegion = this.getClosestRegion( to );

		}

		// check if both convex region are identical

		if ( fromRegion === toRegion ) {

			// no search necessary, directly create the path

			path.push( new Vector3().copy( from ) );
			path.push( new Vector3().copy( to ) );
			return path;

		} else {

			// source and target are not in same region, perform search

			const source = this.getNodeIndex( fromRegion );
			const target = this.getNodeIndex( toRegion );

			const astar = new AStar( graph, source, target );
			astar.search();

			if ( astar.found === true ) {

				const polygonPath = astar.getPath();

				const corridor = new Corridor();
				corridor.push( from, from );

				// push sequence of portal edges to corridor

				const portalEdge = { left: null, right: null };

				for ( let i = 0, l = ( polygonPath.length - 1 ); i < l; i ++ ) {

					const region = this.regions[ polygonPath[ i ] ];
					const nextRegion = this.regions[ polygonPath[ i + 1 ] ];

					region.getPortalEdgeTo( nextRegion, portalEdge );

					corridor.push( portalEdge.left, portalEdge.right );

				}

				corridor.push( to, to );

				path.push( ...corridor.generate() );

			}

			return path;

		}

	}

	/**
	* This method can be used to restrict the movement of a game entity on the navigation mesh.
	* Instead of preventing any form of translation when a game entity hits a border edge, the
	* movement is clamped along the contour of the navigation mesh. The computational overhead
	* of this method for complex navigation meshes can be reduced by using a spatial index.
	*
	* @param {Polygon} currentRegion - The current convex region of the game entity.
	* @param {Vector3} startPosition - The original start position of the entity for the current simulation step.
	* @param {Vector3} endPosition - The original end position of the entity for the current simulation step.
	* @param {Vector3} clampPosition - The clamped position of the entity for the current simulation step.
	* @return {Polygon} The new convex region the game entity is in.
	*/
	clampMovement( currentRegion, startPosition, endPosition, clampPosition ) {

		let newRegion = this.getRegionForPoint( endPosition, this.epsilonContainsTest );

		// if newRegion is null, "endPosition" lies outside of the navMesh

		if ( newRegion === null ) {

			if ( currentRegion === null ) throw new Error( 'YUKA.NavMesh.clampMovement(): No current region available.' );

			// determine closest border edge

			this._getClosestBorderEdge( startPosition, closestBorderEdge );

			const closestEdge = closestBorderEdge.edge;
			const closestPoint = closestBorderEdge.closestPoint;

			// calculate movement and edge direction

			closestEdge.getDirection( edgeDirection );
			const length = movementDirection.subVectors( endPosition, startPosition ).length();

			// this value influences the speed at which the entity moves along the edge

			let f = 0;

			// if startPosition and endPosition are equal, length becomes zero.
			// it's important to test this edge case in order to avoid NaN values.

			if ( length !== 0 ) {

				movementDirection.divideScalar( length );

				f = edgeDirection.dot( movementDirection );

			}

			// calculate new position on the edge

			newPosition.copy( closestPoint ).add( edgeDirection.multiplyScalar( f * length ) );

			// the following value "t" tells us if the point exceeds the line segment

			lineSegment.set( closestEdge.prev.vertex, closestEdge.vertex );
			const t = lineSegment.closestPointToPointParameter( newPosition, false );

			//

			if ( t >= 0 && t <= 1 ) {

				// point is within line segment, we can safely use the new position

				clampPosition.copy( newPosition );

			} else {

				// check, if the new point lies outside the navMesh

				newRegion = this.getRegionForPoint( newPosition, this.epsilonContainsTest );

				if ( newRegion !== null ) {

					// if not, everything is fine

					clampPosition.copy( newPosition );
					return newRegion;

				}

				// otherwise prevent movement

				clampPosition.copy( startPosition );

			}

			return currentRegion;

		} else {

			// return the new region

			return newRegion;

		}

	}

	/**
	* Updates the spatial index by assigning all convex regions to the
	* partitions of the spatial index.
	*
	* @return {NavMesh} A reference to this navigation mesh.
	*/
	updateSpatialIndex() {

		if ( this.spatialIndex !== null ) {

			this.spatialIndex.makeEmpty();

			const regions = this.regions;

			for ( let i = 0, l = regions.length; i < l; i ++ ) {

				const region = regions[ i ];

				this.spatialIndex.addPolygon( region );

			}

		}

		return this;

	}

	_buildRegions( edgeList ) {

		const regions = this.regions;

		const cache = {
			leftPrev: null,
			leftNext: null,
			rightPrev: null,
			rightNext: null
		};

		// process edges from longest to shortest

		for ( let i = 0, l = edgeList.length; i < l; i ++ ) {

			const entry = edgeList[ i ];

			let candidate = entry.edge;

			// cache current references for possible restore

			cache.prev = candidate.prev;
			cache.next = candidate.next;
			cache.prevTwin = candidate.twin.prev;
			cache.nextTwin = candidate.twin.next;

			// temporarily change the first polygon in order to represent both polygons

			candidate.prev.next = candidate.twin.next;
			candidate.next.prev = candidate.twin.prev;
			candidate.twin.prev.next = candidate.next;
			candidate.twin.next.prev = candidate.prev;

			const polygon = candidate.polygon;
			polygon.edge = candidate.prev;

			let attemptMergePolies = this.attemptMergePolies;

			if ( attemptMergePolies && polygon.convex() === true && polygon.coplanar( this.epsilonCoplanarTest ) === true ) {

				// correct polygon reference of all edges

				let edge = polygon.edge;

				do {

					edge.polygon = polygon;

					edge = edge.next;

				} while ( edge !== polygon.edge );

				// delete obsolete polygon

				const index = regions.indexOf( entry.edge.twin.polygon );
				regions.splice( index, 1 );

			} else {

				// restore

				cache.prev.next = candidate;
				cache.next.prev = candidate;
				cache.prevTwin.next = candidate.twin;
				cache.nextTwin.prev = candidate.twin;

				polygon.edge = candidate;

			}

		}

		// after the merging of convex regions, do some post-processing

		for ( let i = 0, l = regions.length; i < l; i ++ ) {

			const region = regions[ i ];

			// compute the centroid of the region which can be used as
			// a destination point in context of path finding

			region.computeCentroid();

			// gather all border edges used by clampMovement()

			let edge = region.edge;

			do {

				if ( edge.twin === null ) this._borderEdges.push( edge );

				edge = edge.next;

			} while ( edge !== region.edge );

		}

	}

	_buildGraph() {

		const graph = this.graph;
		const regions = this.regions;

		// for each region, the code creates an array of directly accessible regions

		const regionNeighbourhood = new Array();

		for ( let i = 0, l = regions.length; i < l; i ++ ) {

			const region = regions[ i ];

			const nodeIndices = new Array();
			regionNeighbourhood.push( nodeIndices );

			let edge = region.edge;

			// iterate through all egdes of the region (in other words: along its contour)

			do {

				// check for a portal edge

				if ( edge.twin !== null ) {

					const nodeIndex = this.getNodeIndex( edge.twin.polygon );

					nodeIndices.push( nodeIndex ); // the node index of the adjacent region

					// add node for this region to the graph if necessary

					if ( graph.hasNode( this.getNodeIndex( edge.polygon ) ) === false ) {

						const node = new NavNode( this.getNodeIndex( edge.polygon ), edge.polygon.centroid );

						graph.addNode( node );

					}

				}

				edge = edge.next;

			} while ( edge !== region.edge );

		}

		// add navigation edges

		for ( let i = 0, il = regionNeighbourhood.length; i < il; i ++ ) {

			const indices = regionNeighbourhood[ i ];
			const from = i;

			for ( let j = 0, jl = indices.length; j < jl; j ++ ) {

				const to = indices[ j ];

				if ( from !== to ) {

					if ( graph.hasEdge( from, to ) === false ) {

						const nodeFrom = graph.getNode( from );
						const nodeTo = graph.getNode( to );

						const cost = nodeFrom.position.distanceTo( nodeTo.position );

						graph.addEdge( new NavEdge( from, to, cost ) );

					}

				}

			}

		}

		return this;

	}

	_getClosestBorderEdge( point, closestBorderEdge ) {

		let borderEdges;
		let minDistance = Infinity;

		if ( this.spatialIndex !== null ) {

			edges.length = 0;

			const index = this.spatialIndex.getIndexForPosition( point );
			const regions = this.spatialIndex.cells[ index ].entries;

			for ( let i = 0, l = regions.length; i < l; i ++ ) {

				const region = regions[ i ];

				let edge = region.edge;

				do {

					if ( edge.twin === null ) edges.push( edge );

					edge = edge.next;

				} while ( edge !== region.edge );

			}

			// user only border edges from adjacent convex regions (fast)

			borderEdges = edges;

		} else {

			// use all border edges (slow)

			borderEdges = this._borderEdges;

		}

		//

		for ( let i = 0, l = borderEdges.length; i < l; i ++ ) {

			const edge = borderEdges[ i ];

			lineSegment.set( edge.prev.vertex, edge.vertex );
			const t = lineSegment.closestPointToPointParameter( point );
			lineSegment.at( t, pointOnLineSegment );

			const distance = pointOnLineSegment.squaredDistanceTo( point );

			if ( distance < minDistance ) {

				minDistance = distance;

				closestBorderEdge.edge = edge;
				closestBorderEdge.closestPoint.copy( pointOnLineSegment );

			}

		}

		return this;

	}

}

//

function descending( a, b ) {

	return ( a.cost < b.cost ) ? 1 : ( a.cost > b.cost ) ? - 1 : 0;

}

/**
* Class for loading navigation meshes as glTF assets. The loader supports
* *glTF* and *glb* files, embedded buffers, index and non-indexed geometries.
* Interleaved geometry data are not yet supported.
*
* @author {@link https://github.com/Mugen87|Mugen87}
*/
class NavMeshLoader {

	/**
	* Loads a {@link NavMesh navigation mesh} from the given URL. The second parameter can be used
	* to influence the parsing of the navigation mesh.
	*
	* @param {String} url - The URL of the glTF asset.
	* @param {Object} options - The configuration object.
	* @return {Promise} A promise representing the loading and parsing process.
	*/
	load( url, options ) {

		return new Promise( ( resolve, reject ) => {

			fetch( url )

				.then( response => {

					if ( response.status >= 200 && response.status < 300 ) {

						return response.arrayBuffer();

					} else {

						const error = new Error( response.statusText || response.status );
						error.response = response;
						return Promise.reject( error );

					}

				} )

				.then( ( arrayBuffer ) => {

					const parser = new Parser();
					const decoder = new TextDecoder();
					let data;

					const magic = decoder.decode( new Uint8Array( arrayBuffer, 0, 4 ) );

					if ( magic === BINARY_EXTENSION_HEADER_MAGIC ) {

						parser.parseBinary( arrayBuffer );

						data = parser.extensions.get( 'BINARY' ).content;

					} else {

						data = decoder.decode( new Uint8Array( arrayBuffer ) );

					}

					const json = JSON.parse( data );

					if ( json.asset === undefined || json.asset.version[ 0 ] < 2 ) {

						throw new Error( 'YUKA.NavMeshLoader: Unsupported asset version.' );

					} else {

						const path = extractUrlBase( url );

						return parser.parse( json, path, options );

					}

				} )

				.then( ( data ) => {

					resolve( data );

				} )

				.catch( ( error ) => {

					Logger.error( 'YUKA.NavMeshLoader: Unable to load navigation mesh.', error );

					reject( error );

				} );

		} );

	}

}

class Parser {

	constructor() {

		this.json = null;
		this.path = null;
		this.cache = new Map();
		this.extensions = new Map();

	}

	parse( json, path, options ) {

		this.json = json;
		this.path = path;

		// read the first mesh in the glTF file

		return this.getDependency( 'mesh', 0 ).then( ( data ) => {

			// parse the raw geometry data into a bunch of polygons

			const polygons = this.parseGeometry( data );

			// create and config navMesh

			const navMesh = new NavMesh();

			if ( options ) {

				if ( options.epsilonCoplanarTest ) navMesh.epsilonCoplanarTest = options.epsilonCoplanarTest;

			}

			// use polygons to setup the nav mesh

			return navMesh.fromPolygons( polygons );

		} );

	}

	parseGeometry( data ) {

		const index = data.index;
		const position = data.position;

		const vertices = new Array();
		const polygons = new Array();

		// vertices

		for ( let i = 0, l = position.length; i < l; i += 3 ) {

			const v = new Vector3();

			v.x = position[ i + 0 ];
			v.y = position[ i + 1 ];
			v.z = position[ i + 2 ];

			vertices.push( v );

		}

		// polygons

		if ( index ) {

			// indexed geometry

			for ( let i = 0, l = index.length; i < l; i += 3 ) {

				const a = index[ i + 0 ];
				const b = index[ i + 1 ];
				const c = index[ i + 2 ];

				const contour = [ vertices[ a ], vertices[ b ], vertices[ c ] ];

				const polygon = new Polygon().fromContour( contour );

				polygons.push( polygon );

			}

		} else {

			// non-indexed geometry //todo test

			for ( let i = 0, l = vertices.length; i < l; i += 3 ) {

				const contour = [ vertices[ i + 0 ], vertices[ i + 1 ], vertices[ i + 2 ] ];

				const polygon = new Polygon().fromContour( contour );

				polygons.push( polygon );

			}

		}

		return polygons;

	}

	getDependencies( type ) {

		const cache = this.cache;

		let dependencies = cache.get( type );

		if ( ! dependencies ) {

			const definitions = this.json[ type + ( type === 'mesh' ? 'es' : 's' ) ] || new Array();

			dependencies = Promise.all( definitions.map( ( definition, index ) => {

				return this.getDependency( type, index );

			} ) );

			cache.set( type, dependencies );

		}

		return dependencies;

	}

	getDependency( type, index ) {

		const cache = this.cache;
		const key = type + ':' + index;

		let dependency = cache.get( key );

		if ( dependency === undefined ) {

			switch ( type ) {

				case 'accessor':
					dependency = this.loadAccessor( index );
					break;

				case 'buffer':
					dependency = this.loadBuffer( index );
					break;

				case 'bufferView':
					dependency = this.loadBufferView( index );
					break;

				case 'mesh':
					dependency = this.loadMesh( index );
					break;

				default:
					throw new Error( 'Unknown type: ' + type );

			}

			cache.set( key, dependency );

		}

		return dependency;

	}

	loadBuffer( index ) {

		const json = this.json;
		const definition = json.buffers[ index ];

		if ( definition.uri === undefined && index === 0 ) {

			return Promise.resolve( this.extensions.get( 'BINARY' ).body );

		}

		return new Promise( ( resolve, reject ) => {

			const url = resolveURI( definition.uri, this.path );

			fetch( url )

				.then( response => {

					return response.arrayBuffer();

				} )

				.then( ( arrayBuffer ) => {

					resolve( arrayBuffer );

				} ).catch( ( error ) => {

					Logger.error( 'YUKA.NavMeshLoader: Unable to load buffer.', error );

					reject( error );

				} );

		} );

	}

	loadBufferView( index ) {

		const json = this.json;

		const definition = json.bufferViews[ index ];

		return this.getDependency( 'buffer', definition.buffer ).then( ( buffer ) => {

			const byteLength = definition.byteLength || 0;
			const byteOffset = definition.byteOffset || 0;
			return buffer.slice( byteOffset, byteOffset + byteLength );

		} );

	}

	loadAccessor( index ) {

		const json = this.json;
		const definition = json.accessors[ index ];

		return this.getDependency( 'bufferView', definition.bufferView ).then( ( bufferView ) => {

			const itemSize = WEBGL_TYPE_SIZES[ definition.type ];
			const TypedArray = WEBGL_COMPONENT_TYPES[ definition.componentType ];
			const byteOffset = definition.byteOffset || 0;

			return new TypedArray( bufferView, byteOffset, definition.count * itemSize );

		} );

	}

	loadMesh( index ) {

		const json = this.json;
		const definition = json.meshes[ index ];

		return this.getDependencies( 'accessor' ).then( ( accessors ) => {

			// assuming a single primitive

			const primitive = definition.primitives[ 0 ];

			if ( primitive.mode !== 4 ) {

				throw new Error( 'YUKA.NavMeshLoader: Invalid geometry format. Please ensure to represent your geometry as triangles.' );

			}

			return {
				index: accessors[ primitive.indices ],
				position: accessors[ primitive.attributes.POSITION ],
				normal: accessors[ primitive.attributes.NORMAL ]
			};

		} );

	}

	parseBinary( data ) {

		const chunkView = new DataView( data, BINARY_EXTENSION_HEADER_LENGTH );
		let chunkIndex = 0;

		const decoder = new TextDecoder();
		let content = null;
		let body = null;

		while ( chunkIndex < chunkView.byteLength ) {

			const chunkLength = chunkView.getUint32( chunkIndex, true );
			chunkIndex += 4;

			const chunkType = chunkView.getUint32( chunkIndex, true );
			chunkIndex += 4;

			if ( chunkType === BINARY_EXTENSION_CHUNK_TYPES.JSON ) {

				const contentArray = new Uint8Array( data, BINARY_EXTENSION_HEADER_LENGTH + chunkIndex, chunkLength );
				content = decoder.decode( contentArray );

			} else if ( chunkType === BINARY_EXTENSION_CHUNK_TYPES.BIN ) {

				const byteOffset = BINARY_EXTENSION_HEADER_LENGTH + chunkIndex;
				body = data.slice( byteOffset, byteOffset + chunkLength );

			}

			chunkIndex += chunkLength;

		}

		this.extensions.set( 'BINARY', { content: content, body: body } );

	}

}

// helper functions

function extractUrlBase( url ) {

	const index = url.lastIndexOf( '/' );

	if ( index === - 1 ) return './';

	return url.substr( 0, index + 1 );

}

function resolveURI( uri, path ) {

	if ( typeof uri !== 'string' || uri === '' ) return '';

	if ( /^(https?:)?\/\//i.test( uri ) ) return uri;

	if ( /^data:.*,.*$/i.test( uri ) ) return uri;

	if ( /^blob:.*$/i.test( uri ) ) return uri;

	return path + uri;

}

//

const WEBGL_TYPE_SIZES = {
	'SCALAR': 1,
	'VEC2': 2,
	'VEC3': 3,
	'VEC4': 4,
	'MAT2': 4,
	'MAT3': 9,
	'MAT4': 16
};

const WEBGL_COMPONENT_TYPES = {
	5120: Int8Array,
	5121: Uint8Array,
	5122: Int16Array,
	5123: Uint16Array,
	5125: Uint32Array,
	5126: Float32Array
};

const BINARY_EXTENSION_HEADER_MAGIC = 'glTF';
const BINARY_EXTENSION_HEADER_LENGTH = 12;
const BINARY_EXTENSION_CHUNK_TYPES = { JSON: 0x4E4F534A, BIN: 0x004E4942 };

/**
* Class for representing a single partition in context of cell-space partitioning.
*
* @author {@link https://github.com/Mugen87|Mugen87}
*/
class Cell {

	/**
	* Constructs a new cell with the given values.
	*
	* @param {AABB} aabb - The bounding volume of the cell.
	*/
	constructor( aabb = new AABB() ) {

		/**
		* The bounding volume of the cell.
		* @type AABB
		*/
		this.aabb = aabb;

		/**
		* The list of entries which belong to this cell.
		* @type Array
		*/
		this.entries = new Array();

	}

	/**
	* Adds an entry to this cell.
	*
	* @param {Any} entry - The entry to add.
	* @return {Cell} A reference to this cell.
	*/
	add( entry ) {

		this.entries.push( entry );

		return this;

	}

	/**
	* Removes an entry from this cell.
	*
	* @param {Any} entry - The entry to remove.
	* @return {Cell} A reference to this cell.
	*/
	remove( entry ) {

		const index = this.entries.indexOf( entry );
		this.entries.splice( index, 1 );

		return this;

	}

	/**
	* Removes all entries from this cell.
	*
	* @return {Cell} A reference to this cell.
	*/
	makeEmpty() {

		this.entries.length = 0;

		return this;

	}

	/**
	* Returns true if this cell is empty.
	*
	* @return {Boolean} Whether this cell is empty or not.
	*/
	empty() {

		return this.entries.length === 0;

	}

	/**
	* Returns true if the given AABB intersects the internal bounding volume of this cell.
	*
	* @param {AABB} aabb - The AABB to test.
	* @return {Boolean} Whether this cell intersects with the given AABB or not.
	*/
	intersects( aabb ) {

		return this.aabb.intersectsAABB( aabb );

	}

	/**
	* Transforms this instance into a JSON object.
	*
	* @return {Object} The JSON object.
	*/
	toJSON() {

		const json = {
			type: this.constructor.name,
			aabb: this.aabb.toJSON(),
			entries: new Array()
		};

		const entries = this.entries;

		for ( let i = 0, l = entries.length; i < l; i ++ ) {

			json.entries.push( entries[ i ].uuid );

		}

		return json;

	}

	/**
	* Restores this instance from the given JSON object.
	*
	* @param {Object} json - The JSON object.
	* @return {Cell} A reference to this game entity.
	*/
	fromJSON( json ) {

		this.aabb.fromJSON( json.aabb );
		this.entries = json.entries.slice();

		return this;

	}

	/**
	* Restores UUIDs with references to GameEntity objects.
	*
	* @param {Map} entities - Maps game entities to UUIDs.
	* @return {Cell} A reference to this cell.
	*/
	resolveReferences( entities ) {

		const entries = this.entries;

		for ( let i = 0, l = entries.length; i < l; i ++ ) {

			entries[ i ] = entities.get( entries[ i ] );

		}

		return this;

	}

}

const clampedPosition = new Vector3();
const aabb$2 = new AABB();
const contour = new Array();

/**
* This class is used for cell-space partitioning, a basic approach for implementing
* a spatial index. The 3D space is divided up into a number of cells. A cell contains a
* list of references to all the entities it contains. Compared to other spatial indices like
* octrees, the division of the 3D space is coarse and often not balanced but the computational
* overhead for calculating the index of a specific cell based on a position vector is very fast.
*
* @author {@link https://github.com/Mugen87|Mugen87}
*/
class CellSpacePartitioning {

	/**
	* Constructs a new spatial index with the given values.
	*
	* @param {Number} width - The width of the entire spatial index.
	* @param {Number} height - The height of the entire spatial index.
	* @param {Number} depth - The depth of the entire spatial index.
	* @param {Number} cellsX - The amount of cells along the x-axis.
	* @param {Number} cellsY - The amount of cells along the y-axis.
	* @param {Number} cellsZ - The amount of cells along the z-axis.
	*/
	constructor( width, height, depth, cellsX, cellsY, cellsZ ) {

		/**
		* The list of partitions.
		* @type Array
		*/
		this.cells = new Array();

		/**
		* The width of the entire spatial index.
		* @type Number
		*/
		this.width = width;

		/**
		* The height of the entire spatial index.
		* @type Number
		*/
		this.height = height;

		/**
		* The depth of the entire spatial index.
		* @type Number
		*/
		this.depth = depth;

		/**
		* The amount of cells along the x-axis.
		* @type Number
		*/
		this.cellsX = cellsX;

		/**
		* The amount of cells along the y-axis.
		* @type Number
		*/
		this.cellsY = cellsY;

		/**
		* The amount of cells along the z-axis.
		* @type Number
		*/
		this.cellsZ = cellsZ;

		this._halfWidth = this.width / 2;
		this._halfHeight = this.height / 2;
		this._halfDepth = this.depth / 2;

		this._min = new Vector3( - this._halfWidth, - this._halfHeight, - this._halfDepth );
		this._max = new Vector3( this._halfWidth, this._halfHeight, this._halfDepth );

		//

		const cellSizeX = this.width / this.cellsX;
		const cellSizeY = this.height / this.cellsY;
		const cellSizeZ = this.depth / this.cellsZ;

		for ( let i = 0; i < this.cellsX; i ++ ) {

			const x = ( i * cellSizeX ) - this._halfWidth;

			for ( let j = 0; j < this.cellsY; j ++ ) {

				const y = ( j * cellSizeY ) - this._halfHeight;

				for ( let k = 0; k < this.cellsZ; k ++ ) {

					const z = ( k * cellSizeZ ) - this._halfDepth;

					const min = new Vector3();
					const max = new Vector3();

					min.set( x, y, z );

					max.x = min.x + cellSizeX;
					max.y = min.y + cellSizeY;
					max.z = min.z + cellSizeZ;

					const aabb = new AABB( min, max );
					const cell = new Cell( aabb );

					this.cells.push( cell );

				}

			}

		}

	}

	/**
	* Updates the partitioning index of a given game entity.
	*
	* @param {GameEntity} entity - The entity to update.
	* @param {Number} currentIndex - The current partition index of the entity.
	* @return {Number} The new partitioning index for the given game entity.
	*/
	updateEntity( entity, currentIndex = - 1 ) {

		const newIndex = this.getIndexForPosition( entity.position );

		if ( currentIndex !== newIndex ) {

			this.addEntityToPartition( entity, newIndex );

			if ( currentIndex !== - 1 ) {

				this.removeEntityFromPartition( entity, currentIndex );

			}

		}

		return newIndex;

	}

	/**
	* Adds an entity to a specific partition.
	*
	* @param {GameEntity} entity - The entity to add.
	* @param {Number} index - The partition index.
	* @return {CellSpacePartitioning} A reference to this spatial index.
	*/
	addEntityToPartition( entity, index ) {

		const cell = this.cells[ index ];
		cell.add( entity );

		return this;

	}

	/**
	* Removes an entity from a specific partition.
	*
	* @param {GameEntity} entity - The entity to remove.
	* @param {Number} index - The partition index.
	* @return {CellSpacePartitioning} A reference to this spatial index.
	*/
	removeEntityFromPartition( entity, index ) {

		const cell = this.cells[ index ];
		cell.remove( entity );

		return this;

	}

	/**
	* Computes the partition index for the given position vector.
	*
	* @param {Vector3} position - The given position.
	* @return {Number} The partition index.
	*/
	getIndexForPosition( position ) {

		clampedPosition.copy( position ).clamp( this._min, this._max );

		let indexX = Math.abs( Math.floor( ( this.cellsX * ( clampedPosition.x + this._halfWidth ) ) / this.width ) );
		let indexY = Math.abs( Math.floor( ( this.cellsY * ( clampedPosition.y + this._halfHeight ) ) / this.height ) );
		let indexZ = Math.abs( Math.floor( ( this.cellsZ * ( clampedPosition.z + this._halfDepth ) ) / this.depth ) );

		// handle index overflow

		if ( indexX === this.cellsX ) indexX = this.cellsX - 1;
		if ( indexY === this.cellsY ) indexY = this.cellsY - 1;
		if ( indexZ === this.cellsZ ) indexZ = this.cellsZ - 1;

		// calculate final index

		return ( indexX * this.cellsY * this.cellsZ ) + ( indexY * this.cellsZ ) + indexZ;

	}

	/**
	* Performs a query to the spatial index according the the given position and
	* radius. The method approximates the query position and radius with an AABB and
	* then performs an intersection test with all non-empty cells in order to determine
	* relevant partitions. Stores the result in the given result array.
	*
	* @param {Vector3} position - The given query position.
	* @param {Number} radius - The given query radius.
	* @param {Array} result - The result array.
	* @return {Array} The result array.
	*/
	query( position, radius, result ) {

		const cells = this.cells;

		result.length = 0;

		// approximate range with an AABB which allows fast intersection test

		aabb$2.min.copy( position ).subScalar( radius );
		aabb$2.max.copy( position ).addScalar( radius );

		// test all non-empty cells for an intersection

		for ( let i = 0, l = cells.length; i < l; i ++ ) {

			const cell = cells[ i ];

			if ( cell.empty() === false && cell.intersects( aabb$2 ) === true ) {

				result.push( ...cell.entries );

			}

		}

		return result;

	}

	/**
	* Removes all entities from all partitions.
	*
	* @return {CellSpacePartitioning} A reference to this spatial index.
	*/
	makeEmpty() {

		const cells = this.cells;

		for ( let i = 0, l = cells.length; i < l; i ++ ) {

			cells[ i ].makeEmpty();

		}

		return this;

	}

	/**
	* Adds a polygon to the spatial index. A polygon is approximated with an AABB.
	*
	* @param {Polygon} polygon - The polygon to add.
	* @return {CellSpacePartitioning} A reference to this spatial index.
	*/
	addPolygon( polygon ) {

		const cells = this.cells;

		polygon.getContour( contour );

		aabb$2.fromPoints( contour );

		for ( let i = 0, l = cells.length; i < l; i ++ ) {

			const cell = cells[ i ];

			if ( cell.intersects( aabb$2 ) === true ) {

				cell.add( polygon );

			}

		}

		return this;

	}

	/**
	 * Transforms this instance into a JSON object.
	 *
	 * @return {Object} The JSON object.
	 */
	toJSON() {

		const json = {
			type: this.constructor.name,
			cells: new Array(),
			width: this.width,
			height: this.height,
			depth: this.depth,
			cellsX: this.cellsX,
			cellsY: this.cellsY,
			cellsZ: this.cellsZ,
			_halfWidth: this._halfWidth,
			_halfHeight: this._halfHeight,
			_halfDepth: this._halfDepth,
			_min: this._min.toArray( new Array() ),
			_max: this._max.toArray( new Array() )
		};

		for ( let i = 0, l = this.cells.length; i < l; i ++ ) {

			json.cells.push( this.cells[ i ].toJSON() );

		}

		return json;

	}

	/**
	 * Restores this instance from the given JSON object.
	 *
	 * @param {Object} json - The JSON object.
	 * @return {CellSpacePartitioning} A reference to this spatial index.
	 */
	fromJSON( json ) {

		this.cells.length = 0;

		this.width = json.width;
		this.height = json.height;
		this.depth = json.depth;
		this.cellsX = json.cellsX;
		this.cellsY = json.cellsY;
		this.cellsZ = json.cellsZ;

		this._halfWidth = json._halfWidth;
		this._halfHeight = json._halfHeight;
		this._halfDepth = json._halfHeight;

		this._min.fromArray( json._min );
		this._max.fromArray( json._max );

		for ( let i = 0, l = json.cells.length; i < l; i ++ ) {

			this.cells.push( new Cell().fromJSON( json.cells[ i ] ) );

		}

		return this;

	}

	/**
	* Restores UUIDs with references to GameEntity objects.
	*
	* @param {Map} entities - Maps game entities to UUIDs.
	* @return {CellSpacePartitioning} A reference to this cell space portioning.
	*/
	resolveReferences( entities ) {

		for ( let i = 0, l = this.cells.length; i < l; i ++ ) {

			this.cells[ i ].resolveReferences( entities );

		}

		return this;

	}

}

/**
* Class for representing the memory information about a single game entity.
*
* @author {@link https://github.com/Mugen87|Mugen87}
*/
class MemoryRecord {

	/**
	* Constructs a new memory record.
	*
	* @param {GameEntity} entity - The game entity that is represented by this memory record.
	*/
	constructor( entity = null ) {

		/**
		* The game entity that is represented by this memory record.
		* @type GameEntity
		*/
		this.entity = entity;

		/**
		* Records the time the entity became visible. Useful in combination with a reaction time
		* in order to prevent immediate actions.
		* @type Number
		* @default - Infinity
		*/
		this.timeBecameVisible = - Infinity;

		/**
		* Records the time the entity was last sensed (e.g. seen or heard). Used to determine
		* if a game entity can "remember" this record or not.
		* @type Number
		* @default - Infinity
		*/
		this.timeLastSensed = - Infinity;

		/**
		* Marks the position where the opponent was last sensed.
		* @type Vector3
		*/
		this.lastSensedPosition = new Vector3();

		/**
		* Whether this game entity is visible or not.
		* @type Boolean
		* @default false
		*/
		this.visible = false;

	}

	/**
	* Transforms this instance into a JSON object.
	*
	* @return {Object} The JSON object.
	*/
	toJSON() {

		return {
			type: this.constructor.name,
			entity: this.entity.uuid,
			timeBecameVisible: this.timeBecameVisible.toString(),
			timeLastSensed: this.timeLastSensed.toString(),
			lastSensedPosition: this.lastSensedPosition.toArray( new Array() ),
			visible: this.visible
		};

	}

	/**
	* Restores this instance from the given JSON object.
	*
	* @param {Object} json - The JSON object.
	* @return {MemoryRecord} A reference to this memory record.
	*/
	fromJSON( json ) {

		this.entity = json.entity; // uuid
		this.timeBecameVisible = parseFloat( json.timeBecameVisible );
		this.timeLastSensed = parseFloat( json.timeLastSensed );
		this.lastSensedPosition.fromArray( json.lastSensedPosition );
		this.visible = json.visible;

		return this;

	}

	/**
	* Restores UUIDs with references to GameEntity objects.
	*
	* @param {Map} entities - Maps game entities to UUIDs.
	* @return {MemoryRecord} A reference to this memory record.
	*/
	resolveReferences( entities ) {

		this.entity = entities.get( this.entity ) || null;

		return this;

	}

}

/**
* Class for representing the memory system of a game entity. It is used for managing,
* filtering, and remembering sensory input.
*
* @author {@link https://github.com/Mugen87|Mugen87}
*/
class MemorySystem {

	/**
	* Constructs a new memory system.
	*
	* @param {GameEntity} owner - The game entity that owns this memory system.
	*/
	constructor( owner = null ) {

		/**
		* The game entity that owns this memory system.
		* @type GameEntity
		*/
		this.owner = owner;

		/**
		* Used to simulate memory of sensory events. It contains {@link MemoryRecord memory records}
		* of all relevant game entities in the environment. The records are usually update by
		* the owner of the memory system.
		* @type Array
		*/
		this.records = new Array();

		/**
		* Same as {@link MemorySystem#records} but used for fast access via the game entity.
		* @type Map
		*/
		this.recordsMap = new Map();

		/**
		* Represents the duration of the game entities short term memory in seconds.
		* When a bot requests a list of all recently sensed game entities, this value
		* is used to determine if the bot is able to remember a game entity or not.
		* @type Number
		* @default 1
		*/
		this.memorySpan = 1;

	}

	/**
	* Returns the memory record of the given game entity.
	*
	* @param {GameEntity} entity - The game entity.
	* @return {MemoryRecord} The memory record for this game entity.
	*/
	getRecord( entity ) {

		return this.recordsMap.get( entity );

	}

	/**
	* Creates a memory record for the given game entity.
	*
	* @param {GameEntity} entity - The game entity.
	* @return {MemorySystem} A reference to this memory system.
	*/
	createRecord( entity ) {

		const record = new MemoryRecord( entity );

		this.records.push( record );
		this.recordsMap.set( entity, record );

		return this;

	}

	/**
	* Deletes the memory record for the given game entity.
	*
	* @param {GameEntity} entity - The game entity.
	* @return {MemorySystem} A reference to this memory system.
	*/
	deleteRecord( entity ) {

		const record = this.getRecord( entity );
		const index = this.records.indexOf( record );

		this.records.splice( index, 1 );
		this.recordsMap.delete( entity );

		return this;

	}

	/**
	* Returns true if there is a memory record for the given game entity.
	*
	* @param {GameEntity} entity - The game entity.
	* @return {Boolean} Whether the game entity has a memory record or not.
	*/
	hasRecord( entity ) {

		return this.recordsMap.has( entity );

	}

	/**
	* Removes all memory records from the memory system.
	*
	* @return {MemorySystem} A reference to this memory system.
	*/
	clear() {

		this.records.length = 0;
		this.recordsMap.clear();

		return this;

	}

	/**
	* Determines all valid memory record and stores the result in the given array.
	*
	* @param {Number} currentTime - The current elapsed time.
	* @param {Array} result - The result array.
	* @return {Array} The result array.
	*/
	getValidMemoryRecords( currentTime, result ) {

		const records = this.records;

		result.length = 0;

		for ( let i = 0, l = records.length; i < l; i ++ ) {

			const record = records[ i ];

			if ( ( currentTime - record.timeLastSensed ) <= this.memorySpan ) {

				result.push( record );

			}

		}

		return result;

	}

	/**
	* Transforms this instance into a JSON object.
	*
	* @return {Object} The JSON object.
	*/
	toJSON() {

		const json = {
			type: this.constructor.name,
			owner: this.owner.uuid,
			records: new Array(),
			memorySpan: this.memorySpan
		};

		const records = this.records;

		for ( let i = 0, l = records.length; i < l; i ++ ) {

			const record = records[ i ];
			json.records.push( record.toJSON() );

		}

		return json;

	}

	/**
	* Restores this instance from the given JSON object.
	*
	* @param {Object} json - The JSON object.
	* @return {MemorySystem} A reference to this memory system.
	*/
	fromJSON( json ) {

		this.owner = json.owner; // uuid
		this.memorySpan = json.memorySpan;

		const recordsJSON = json.records;

		for ( let i = 0, l = recordsJSON.length; i < l; i ++ ) {

			const recordJSON = recordsJSON[ i ];
			const record = new MemoryRecord().fromJSON( recordJSON );

			this.records.push( record );

		}

		return this;

	}

	/**
	* Restores UUIDs with references to GameEntity objects.
	*
	* @param {Map} entities - Maps game entities to UUIDs.
	* @return {MemorySystem} A reference to this memory system.
	*/
	resolveReferences( entities ) {

		this.owner = entities.get( this.owner ) || null;

		// records

		const records = this.records;

		for ( let i = 0, l = records.length; i < l; i ++ ) {

			const record = 	records[ i ];

			record.resolveReferences( entities );
			this.recordsMap.set( record.entity, record );

		}

		return this;

	}

}

const toPoint = new Vector3();
const direction$1 = new Vector3();
const ray$1 = new Ray();
const intersectionPoint$1 = new Vector3();
const worldPosition = new Vector3();

/**
 * Class for representing the vision component of a game entity.
 *
 * @author {@link https://github.com/Mugen87|Mugen87}
 */
class Vision {

	/**
	 * Constructs a new vision object.
	 *
	 * @param {GameEntity} owner - The owner of this vision instance.
	 */
	constructor( owner = null ) {

		/**
		 * The game entity that owns this vision instance.
		 * @type GameEntity
		 */
		this.owner = owner;

		/**
		 * The field of view in radians.
		 * @type Number
		 * @default π
		 */
		this.fieldOfView = Math.PI;

		/**
		 * The visual range in world units.
		 * @type Number
		 * @default Infinity
		 */
		this.range = Infinity;

		/**
		 * An array of obstacles. An obstacle is a game entity that
		 * implements the {@link GameEntity#lineOfSightTest} method.
		 * @type Array
		 */
		this.obstacles = new Array();

	}

	/**
	 * Adds an obstacle to this vision instance.
	 *
	 * @param {GameEntity} obstacle - The obstacle to add.
	 * @return {Vision} A reference to this vision instance.
	 */
	addObstacle( obstacle ) {

		this.obstacles.push( obstacle );

		return this;

	}

	/**
	 * Removes an obstacle from this vision instance.
	 *
	 * @param {GameEntity} obstacle - The obstacle to remove.
	 * @return {Vision} A reference to this vision instance.
	 */
	removeObstacle( obstacle ) {

		const index = this.obstacles.indexOf( obstacle );
		this.obstacles.splice( index, 1 );

		return this;

	}

	/**
	 * Performs a line of sight test in order to determine if the given point
	 * in 3D space is visible for the game entity.
	 *
	 * @param {Vector3} point - The point to test.
	 * @return {Boolean} Whether the given point is visible or not.
	 */
	visible( point ) {

		const owner = this.owner;
		const obstacles = this.obstacles;

		owner.getWorldPosition( worldPosition );

		// check if point lies within the game entity's visual range

		toPoint.subVectors( point, worldPosition );
		const distanceToPoint = toPoint.length();

		if ( distanceToPoint > this.range ) return false;

		// next, check if the point lies within the game entity's field of view

		owner.getWorldDirection( direction$1 );

		const angle = direction$1.angleTo( toPoint );

		if ( angle > ( this.fieldOfView * 0.5 ) ) return false;

		// the point lies within the game entity's visual range and field
		// of view. now check if obstacles block the game entity's view to the given point.

		ray$1.origin.copy( worldPosition );
		ray$1.direction.copy( toPoint ).divideScalar( distanceToPoint || 1 ); // normalize

		for ( let i = 0, l = obstacles.length; i < l; i ++ ) {

			const obstacle = obstacles[ i ];

			const intersection = obstacle.lineOfSightTest( ray$1, intersectionPoint$1 );

			if ( intersection !== null ) {

				// if an intersection point is closer to the game entity than the given point,
				// something is blocking the game entity's view

				const squaredDistanceToIntersectionPoint = intersectionPoint$1.squaredDistanceTo( worldPosition );

				if ( squaredDistanceToIntersectionPoint <= ( distanceToPoint * distanceToPoint ) ) return false;

			}

		}

		return true;

	}

	/**
	 * Transforms this instance into a JSON object.
	 *
	 * @return {Object} The JSON object.
	 */
	toJSON() {

		const json = {
			type: this.constructor.name,
			owner: this.owner.uuid,
			fieldOfView: this.fieldOfView,
			range: this.range.toString()
		};

		json.obstacles = new Array();

		for ( let i = 0, l = this.obstacles.length; i < l; i ++ ) {

			const obstacle = this.obstacles[ i ];
			json.obstacles.push( obstacle.uuid );

		}

		return json;

	}

	/**
	 * Restores this instance from the given JSON object.
	 *
	 * @param {Object} json - The JSON object.
	 * @return {Vision} A reference to this vision.
	 */
	fromJSON( json ) {

		this.owner = json.owner;
		this.fieldOfView = json.fieldOfView;
		this.range = parseFloat( json.range );

		for ( let i = 0, l = json.obstacles.length; i < l; i ++ ) {

			const obstacle = json.obstacles[ i ];
			this.obstacles.push( obstacle );

		}

		return this;

	}

	/**
	 * Restores UUIDs with references to GameEntity objects.
	 *
	 * @param {Map} entities - Maps game entities to UUIDs.
	 * @return {Vision} A reference to this vision.
	 */
	resolveReferences( entities ) {

		this.owner = entities.get( this.owner ) || null;

		const obstacles = this.obstacles;

		for ( let i = 0, l = obstacles.length; i < l; i ++ ) {

			obstacles[ i ] = entities.get( obstacles[ i ] );

		}

		return this;

	}

}

const translation$1 = new Vector3();
const predictedPosition$3 = new Vector3();
const normalPoint = new Vector3();
const lineSegment$1 = new LineSegment();
const closestNormalPoint = new Vector3();

/**
* This steering behavior produces a force that keeps a vehicle close to its path. It is intended
* to use it in combination with {@link FollowPathBehavior} in order to realize a more strict path following.
*
* @author {@link https://github.com/Mugen87|Mugen87}
* @augments SteeringBehavior
*/
class OnPathBehavior extends SteeringBehavior {

	/**
	* Constructs a new on path behavior.
	*
	* @param {Path} path - The path to stay close to.
	* @param {Number} radius - Defines the width of the path. With a smaller radius, the vehicle will have to follow the path more closely.
	* @param {Number} predictionFactor - Determines how far the behavior predicts the movement of the vehicle.
	*/
	constructor( path = new Path(), radius = 0.1, predictionFactor = 1 ) {

		super();

		/**
		* The path to stay close to.
		* @type Path
		*/
		this.path = path;

		/**
		* Defines the width of the path. With a smaller radius, the vehicle will have to follow the path more closely.
		* @type Number
		* @default 0.1
		*/
		this.radius = radius;

		/**
		* Determines how far the behavior predicts the movement of the vehicle.
		* @type Number
		* @default 1
		*/
		this.predictionFactor = predictionFactor;

		// internal behaviors

		this._seek = new SeekBehavior();

	}

	/**
	* Calculates the steering force for a single simulation step.
	*
	* @param {Vehicle} vehicle - The game entity the force is produced for.
	* @param {Vector3} force - The force/result vector.
	* @param {Number} delta - The time delta.
	* @return {Vector3} The force/result vector.
	*/
	calculate( vehicle, force /*, delta */ ) {

		const path = this.path;

		// predicted future position

		translation$1.copy( vehicle.velocity ).multiplyScalar( this.predictionFactor );
		predictedPosition$3.addVectors( vehicle.position, translation$1 );

		// compute closest line segment and normal point. the normal point is computed by projecting
		// the predicted position of the vehicle on a line segment.

		let minDistance = Infinity;

		let l = path._waypoints.length;

		// handle looped paths differently since they have one line segment more

		l = ( path.loop === true ) ? l : l - 1;

		for ( let i = 0; i < l; i ++ ) {

			lineSegment$1.from = path._waypoints[ i ];

			// the last waypoint needs to be handled differently for a looped path.
			// connect the last point with the first one in order to create the last line segment

			if ( path.loop === true && i === ( l - 1 ) ) {

				lineSegment$1.to = path._waypoints[ 0 ];

			} else {

				lineSegment$1.to = path._waypoints[ i + 1 ];

			}

			lineSegment$1.closestPointToPoint( predictedPosition$3, true, normalPoint );

			const distance = predictedPosition$3.squaredDistanceTo( normalPoint );

			if ( distance < minDistance ) {

				minDistance = distance;
				closestNormalPoint.copy( normalPoint );

			}

		}

		// seek towards the projected point on the closest line segment if
		// the predicted position of the vehicle is outside the valid range.
		// also ensure that the path length is greater than zero when performing a seek

		if ( minDistance > ( this.radius * this.radius ) && path._waypoints.length > 1 ) {

			this._seek.target = closestNormalPoint;
			this._seek.calculate( vehicle, force );

		}

		return force;

	}

	/**
	* Transforms this instance into a JSON object.
	*
	* @return {Object} The JSON object.
	*/
	toJSON() {

		const json = super.toJSON();

		json.path = this.path.toJSON();
		json.radius = this.radius;
		json.predictionFactor = this.predictionFactor;

		return json;

	}

	/**
	* Restores this instance from the given JSON object.
	*
	* @param {Object} json - The JSON object.
	* @return {OnPathBehavior} A reference to this behavior.
	*/
	fromJSON( json ) {

		super.fromJSON( json );

		this.path.fromJSON( json.path );
		this.radius = json.radius;
		this.predictionFactor = json.predictionFactor;

		return this;

	}

}

class FlowVertex extends Vector3 {
	constructor(v) {
		super();
		this.vertex = v;
	}

	/**
	 * Initialises known variables for spinning flow vertex (rotating flow vector) to handle interpolated movement around sharp corners
	 * http://citeseerx.ist.psu.edu/viewdoc/download?doi=10.1.1.68.875&rep=rep1&type=pdf#page=3
	 * @param {*} edgeWithin
	 */
	initSpinning(edgeWithin, onRight, edgeNext, finalDestPt, diagonalEdgeMode = false) {
		this.spinningOnRight = onRight;

		// pre-calculate normal proceeding outward from inner edgeWithin to determine when flow vertex starts to spin
		// as long as it meets splitNormal condition, result flow vector will always spin towards agent

		// Is there any intersection that will cause subdivision into sub triangles?
		// check edgeWithin.polygon if it's a triangle or a non-triangle?
		// for triangle, can easily get split point along known boundary edge of polygon (left or right)
		// Get spin edge accordingly and point along split edge for spinningRegion
			this.splitNormal = new Vector3();
			//this.splitPoint = new FlowVertex();
		// flag that determines region check to then check for sub-triangles if needed for agent
			//this.splitRegion = edgeWithin.polygon;

		// for non-triangle, triangulation is variable based on the flow to next portal edgeWithin, from start portal edge.
		//    For the sake of simplciity, assumed a quad split on left to right diagonal from startPortal to edgeWithin.
		// In some cases, , this might result in a triangle if both portal edges share the same vertex

		// whether it needs to split into 3rd sub-triangle, is determined based on subsequent edge's flowVertex along common split edge in question
		// Could this action be lazy-defered later until agent enters into splittingRegion?
		// this.edgeOfFlowVertexToCheck = edgeNext???
			// this.splitNormal2 = new Vector3();
			// this.splitPoint2 = new FlowVertex();
		// howver, if edgeNext is unavailable, then use assumed finalDestPt to determine 3rd sub-triangle split immediately

		return this;
	}

	initFinal(destPt) {
		this.final = true;
		return this;
	}
}

const HANDEDNESS_RIGHT = 1;
const HANDEDNESS_LEFT = -1;
var USE_HANDEDNESS = HANDEDNESS_LEFT;

var DISCONTINUOUS = false;

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
		let debugCount = 0;
		let debugEdgeCount = 0;



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

					resolved = true;
				}
				dir = this.rightEdgeDirs ? this.rightEdgeDirs[0] : null;
				if (dir &&  (dir.x*edge.vertex.x + dir.z*edge.vertex.z > dir.offset ) ) {
					dir = new Vector3();
					fEdge = FlowTriangulate.calculateDirForFanEdge(edge.vertex, nextPortal.prev.vertex, dir, true);

					this.rightEdgeDirs.push(dir);
					this.rightEdgeFlows.push(fEdge);
					debugCount++;

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
			if (dz * pos.z + dx * pos.x < 0) {
				edge = edge.next;
				continue;
			}

			dz = -edge.vertex.x + finalDestPt.x;
			dx = edge.vertex.z - finalDestPt.z;
			dz *= handedness;
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
					console.warn("Out of bounds detected for position..left");
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
					console.warn("Out of bounds detected for position..right");
				}
			}
		} else {
			lane = 0;
		}

		// debug
		if (lane != 0) console.log("Lane != 0 case detected:"+lane +" / "+ (lane < 0 ? this.leftEdgeDirs : this.rightEdgeDirs ).length);

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

const CALC_VEC = new Vector3();
const CALC_VEC2 = new Vector3();
const CALC_VEC3 = new Vector3();

/**
 * Gridless flowfield on navmesh generation
 * https://gingkoapp.com/how-to-gridless-rts
 */

class NavMeshFlowField {
	constructor(navMesh) {
		this.navMesh = navMesh;

		this._flowedFinal = false;
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
		this.savedRegionFlows = new Map();
		this.pathRef = pathRef;
	}

	resetPersistant(pathRef) {
		this.edgeFieldMap.clear();
		this.triangulationMap.clear();
		this.savedRegionFlows.clear();
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

	hasFlowFromRegion(fromRegion, pathRef) {
		if (!pathRef) pathRef = this.pathRef;
		return !Array.isArray(pathRef) ? pathRef._cost.has(this.navMesh.getNodeIndex(fromRegion)) // Dijkstra assumed pre-searched (ie. source is fill "destination")
			: pathRef.indexOf(this.navMesh.getNodeIndex(fromRegion)) >= 0; // Pathed array
	}

	/**
	 *
	 * @param {Number} node	Node index to start from
	 * @param {[Node]|(Dijkstra)} pathRef	Result from getPath(), or pre-searched to destination Dijkstra with .source as the final destination and .destination as -1
	 * @param {BooleanD} getAll Always get all flow edges until reach end of path
	 * @return [Number] All portal edges that comprise of the necesary regions to be able to help calculate flowfield from given node (as if starting from that node).
	 *  If no path can be found from given node, returns null.
	 */
	getFlowEdges(node, pathRef, getAll) {
		let resultArr = [];
		let n;
		let tryNode;
		let tryEdge;
		let firstEdge = null;

		this._flowedFinal = false;	// for test-debugging purposes

		if (!Array.isArray(pathRef)) { // Dijkstra assumed pre-searched (ie. source is fill "destination")
			// iterate through all regions to find lowest costs
			let costs = pathRef._cost;
			if (!costs.has(node)) {
				return null;
			}
			let tryCost = Infinity;
			n = node;
			if (node === pathRef.source) {
				this._flowedFinal = true;
				return resultArr;
			}

			while(n !== null) {
				let edges = this.navMesh.graph._edges.get( n );
				let len = edges.length;


				tryNode = null;


				for (let i=0; i<len; i++) {

					let toN = edges[i].to;
					if (toN === pathRef.source) {
						tryNode = toN;
						break;
					}
					if (costs.has(toN) && costs.get(toN) < tryCost) {
						tryCost = costs.get(toN);
						tryNode = toN;
					}
				}

				if (tryNode !== null) {
					tryEdge = this.navMesh.regions[n].getEdgeTo(this.navMesh.regions[tryNode]);
					if (firstEdge !== null) {
						resultArr.push(tryEdge);
						n = tryEdge.vertex === firstEdge.vertex || tryEdge.prev.vertex === firstEdge.prev.vertex ? tryNode : null;

						if (getAll) n = tryNode;

					} else {
						firstEdge = tryEdge;
						resultArr.push(tryEdge);
						n = tryNode;
					}

					if (tryNode === pathRef.source) {
						this._flowedFinal = true;
						break;
					}
				} else {
					n = null;
					tryNode = null;
				}
			}


		} else {
			var startIndex = pathRef.indexOf(node);
			if (startIndex < 0) return null;
			if (startIndex >= pathRef.length - 1) {
				this._flowedFinal = true;
				return resultArr;
			}
			tryNode = pathRef[++startIndex];
			firstEdge = this.navMesh.regions[node].getEdgeTo(this.navMesh.regions[tryNode]);
			resultArr.push(firstEdge);
			n = tryNode;
			while (n!==null) {
				tryNode = pathRef[++startIndex];
				if (!tryNode) break;
				tryEdge = this.navMesh.regions[n].getEdgeTo(this.navMesh.regions[tryNode]);
				resultArr.push(tryEdge);
				n = tryEdge.vertex === firstEdge.vertex || tryEdge.prev.vertex === firstEdge.prev.vertex ? tryNode : null;

				if (getAll) n = tryNode;
			}

			this._flowedFinal = startIndex >= pathRef.length - 1;
		}
		return resultArr;
	}

	collinear(portalEdge, edge) {
		let x1 = portalEdge.prev.vertex.x;
		let y1 = portalEdge.prev.vertex.z;
		let x2 = portalEdge.vertex.x;
		let y2 = portalEdge.vertex.z;
		let tarVertex = portalEdge.prev === edge ? edge.prev.vertex : edge.vertex;
		let x3 = tarVertex.x;
		let y3 = tarVertex.z;
		let collinear0 = x1 * (y2 - y3) +   x2 * (y3 - y1) +   x3 * (y1 - y2) === 0;
		if (collinear0) console.log("Collinear detected");
		return collinear0;
	}

	setupTriangulation(fromPortal, nextPortal, persistKey) {
		// get conventional makeshift triangulation towards "nextPortal", pick largest opposite edge towards newPortal
		// OR simply pick largest edge that isn't nextPortal

		if (!fromPortal) {
			let longestEdgeDist = 0;
			let edge = nextPortal.polygon.edge;
			do {
				if (edge !== nextPortal && !this.collinear(nextPortal, edge)) {
					let dist = edge.squaredLength();
					if (dist >= longestEdgeDist) {  // (fromPortal && (!fromPortal.twin && edge.twin))
						longestEdgeDist = dist;
						fromPortal = edge;
					}
				}
				edge = edge.next;
			} while(edge !== nextPortal.polygon.edge);
		}


		let triangulation = null;
		if (!this.triangulationMap) {
			if (!this.localTriangulation) {
				this.localTriangulation = new FlowTriangulate(fromPortal, nextPortal);
			}
			triangulation = this.localTriangulation;

		} else {	// persitant
			let triangulationMap = this.triangulationMap;
			if (!persistKey) persistKey = fromPortal;
			triangulation = triangulationMap.get(persistKey);
			if (!triangulation) {
				// setup triangulation o store in map
				triangulation = new FlowTriangulate(fromPortal, nextPortal);
				triangulationMap.set(persistKey, triangulation);
			}
		}
		return triangulation;
	}

	/**
	 * An implementation of:
	 * http://citeseerx.ist.psu.edu/viewdoc/download?doi=10.1.1.68.875&rep=rep1&type=pdf#page=2
	 * @param {Polygon} region The starting polygon reference to calculate flowfield for
	 * @param {Array<HalfEdge>} edgeFlows List of connecting portal edges along path up to the edge which doesn't share any vertex with the first portal edge
	 * @param {Vector3} finalDestPt	Final destination point reference
	 */
	_calcTriRegionField(region, edgeFlows, finalDestPt) {
		// link   nextPortal  vertex vectors along incident  X and B sets
		const a = CALC_VEC;
		const b = CALC_VEC2;
		let edgeFieldMap = this.edgeFieldMap;

		// Launch flow vector from isolated vertex corner

		let edge = region.edge;	// 1st edge
		let tryEdge = edgeFlows[0];
		// link start vertex vector to nextPortal's midpoint
		// get start corner flow vertex
		if (edge !== tryEdge) {
			edge = edge.next; // 2nd edge
			if (edge !== tryEdge) {
				edge = edge.next;	// 3rd edge
			}
		}

		let isolatedV = edge.next.vertex;

		a.x = isolatedV.x;
		a.z = isolatedV.z;
		b.x = (edge.vertex.x + edge.prev.vertex.x) * 0.5;
		b.z = (edge.vertex.z + edge.prev.vertex.z) * 0.5;

		edgeFieldMap.set(isolatedV, new FlowVertex(isolatedV).subVectors(b,a).normalize());

		// Calculate destination portal flow vectors
		this._calcDestPortalField(edgeFlows, isolatedV, null, finalDestPt);
	}

	_calcDestPortalField(edgeFlows, iVertex, iVertex2, finalDestPt) {
		const a = CALC_VEC;
		const b = CALC_VEC2;
		const c = CALC_VEC3;
		let edgeFieldMap = this.edgeFieldMap;

		let edge = edgeFlows[0];
		let isolatedV;

		const HANDEDNESS = USE_HANDEDNESS;

		// Calculate destination portal flow vectors
		let leftFlowVertex;
		let rightFlowVertex;
		let t;
		let i;
		// (C1) determine left B1, B2 edge to flow vertex check
		t = 0;
		isolatedV = iVertex;
		edge = edgeFlows[0];
		a.x = edge.vertex.x - isolatedV.x;
		a.z = edge.vertex.z - isolatedV.z;
		// perp boundary normal inward
		c.x = a.z * HANDEDNESS;
		c.z = -a.x * HANDEDNESS;

		tryEdge = edgeFlows[++t];
		// find non-incident portal edge along flow to vertex
		while (tryEdge && edge.vertex === tryEdge.vertex) {
			tryEdge = edgeFlows[++t];
		}
		if (tryEdge) {
			// flow along b2 for next non-incident portal
			b.x = tryEdge.vertex.x - edge.vertex.x;
			b.z = tryEdge.vertex.z - edge.vertex.z;
			// does flow along b2 lie within boundary normal?
			leftFlowVertex = new FlowVertex(edge.vertex).copy(b.x * c.x + b.z * c.z >= 0 ? b : a).normalize();
		} else {
			if (tryEdge) { // leads indirectly to end
				leftFlowVertex =  new FlowVertex(edge.vertex).copy(a).normalize();
			} else { // assumed leads directly into final destination node from starting node, finalDestPt requried
				b.x = finalDestPt.x - edge.vertex.x;
				b.z = finalDestPt.z - edge.vertex.z;
				leftFlowVertex =  new FlowVertex(edge.vertex).copy(b.x * c.x + b.z * c.z >= 0 ? b : a).normalize().initFinal(finalDestPt);
				// !Check if need to non-normalize for finalDestPt?
			}
		}
		// (C2) check X portal edges incident to leftFlowVertex to determine if initSpinning required
		for (i=1; i<t; i++) {
			tryEdge = edgeFlows[i];
			a.x = tryEdge.prev.vertex.x - tryEdge.vertex.x;
			a.z = tryEdge.prev.vertex.z - tryEdge.vertex.z;
			// perp forward normal along edge flow X
			c.x = -a.z * HANDEDNESS;
			c.z = a.x * HANDEDNESS;
			if (leftFlowVertex.x * c.x + leftFlowVertex.z * c.z < 0) {
				leftFlowVertex.initSpinning(tryEdge, false, edgeFlows[i+1], finalDestPt);
				break;
			}
		}
		// consider left to right non-tri triangulation diagonal case
		// (from left entering portal vertex to right destination portal vertex along main triangulation corridoor, if any)
		if (t === edgeFlows.length - 1) {
			tryEdge = edgeFlows[t];
			if (tryEdge.next.next.next !== tryEdge && tryEdge.prev.vertex !== edge.vertex) {
				a.x = tryEdge.prev.vertex.x - edge.vertex.x;
				a.z = tryEdge.prev.vertex.z - edge.vertex.z;
				// perp forward normal along edge flow X
				c.x = -a.z * HANDEDNESS;
				c.z = a.x * HANDEDNESS;
				if (leftFlowVertex.x * c.x + leftFlowVertex.z * c.z < 0) {
					leftFlowVertex.initSpinning(tryEdge, false, null, finalDestPt, true);
				}
			}
		}

		// (C1) determine right B1, B2 edge to flow vertex check
		t = 0;
		edge = edgeFlows[0];
		isolatedV = iVertex2 ? iVertex2 : iVertex;
		a.x = edge.prev.vertex.x - isolatedV.x;
		a.z = edge.prev.vertex.z - isolatedV.z;
		// perp boundary normal inwards (flipped in other direction for other side)
		c.x = -a.z * HANDEDNESS;
		c.z = a.x * HANDEDNESS;

		tryEdge = edgeFlows[++t];
		// find non-incident portal edge along flow to vertex
		while (tryEdge && edge.prev.vertex === tryEdge.prev.vertex) {
			tryEdge = edgeFlows[++t];
		}
		if (tryEdge) {
			// flow along b2 for next non-incident portal
			b.x = tryEdge.prev.vertex.x - edge.prev.vertex.x;
			b.z = tryEdge.prev.vertex.z - edge.prev.vertex.z;
			// does flow along b2 lie within boundary normal?
			rightFlowVertex = new FlowVertex(edge.prev.vertex).copy(b.x * c.x + b.z * c.z >= 0 ? b : a).normalize();
		} else {
			if (tryEdge) { // leads indirectly to end
				rightFlowVertex =  new FlowVertex(edge.prev.vertex).copy(a).normalize();
			} else { // assumed leads directly into final destination node from starting node, finalDestPt requried
				b.x = finalDestPt.x - edge.prev.vertex.x;
				b.z = finalDestPt.z - edge.prev.vertex.z;
				rightFlowVertex =  new FlowVertex(edge.prev.vertex).copy(b.x * c.x + b.z * c.z >= 0 ? b : a).normalize().initFinal(finalDestPt);
			}
		}
		// (C2) check X portal edges incident to rightFlowVertex to determine if initSpinning required
		for (i=1; i<t; i++) {
			tryEdge = edgeFlows[i];
			a.x = tryEdge.prev.vertex.x - tryEdge.vertex.x;
			a.z = tryEdge.prev.vertex.z - tryEdge.vertex.z;
			// perp forward normal along edge flow X
			c.x = -a.z * HANDEDNESS;
			c.z = a.x * HANDEDNESS;
			if (rightFlowVertex.x * c.x + rightFlowVertex.z * c.z < 0) {
				rightFlowVertex.initSpinning(tryEdge, true, edgeFlows[i+1], finalDestPt);
				break;
			}
		}

		let result = [leftFlowVertex, rightFlowVertex];
		edgeFieldMap.set(edge, result);
		return result;
	}

	_calcNonTriRegionField(triangulation, edgeFlows, finalDestPt) {
		const a = CALC_VEC;
		const b = CALC_VEC2;
		let edgeFieldMap = this.edgeFieldMap;

		let edge = triangulation.fromPortal;	// from inside of region
		let tryEdge = triangulation.nextPortal; // from inside of region

		if (tryEdge !== edgeFlows[0]) {
			throw new Error("Assertion failed: nextPortal of triangulation should match edgeFlows[0] assumption!");
		}

		let leftFlowVertex = null;
		let rightFlowVertex = null;

		// Determine fromPortal flow vectors

		// towards nextPortal on left border, fromPortal
		if (edge.prev.vertex !== tryEdge.vertex) {
			a.x = edge.prev.vertex.x;
			a.z = edge.prev.vertex.z;
			b.x = tryEdge.vertex.x;
			b.z = tryEdge.vertex.z;
			leftFlowVertex = new FlowVertex(edge.prev.vertex).subVectors(b, a).normalize();
		} // else will share same vertex on fromPortal edge

		// towards nextPortal on right border, fromPortal
		if (edge.vertex !== tryEdge.prev.vertex) {
			a.x = edge.vertex.x;
			a.z = edge.vertex.z;
			b.x = tryEdge.prev.vertex.x;
			b.z = tryEdge.prev.vertex.z;
			rightFlowVertex = new FlowVertex(edge.vertex).subVectors(b, a).normalize();
		} // else will share same vertex on fromPortal edge

		let fromPortalVectors;
		edgeFieldMap.set(edge, fromPortalVectors = [leftFlowVertex, rightFlowVertex]);

		// Calculate destination portal flow vectors
		let result = this._calcDestPortalField(edgeFlows, leftFlowVertex ? leftFlowVertex.vertex : rightFlowVertex.vertex,
			(leftFlowVertex && rightFlowVertex) ? rightFlowVertex.vertex : null, finalDestPt);


		if (!fromPortalVectors[0]) {
			fromPortalVectors[0] = result[0];
		}

		if (!fromPortalVectors[1]) {
			fromPortalVectors[1] = result[1];
		}

		let destResult = result;

		// debugging...
		if (!fromPortalVectors[0] || !fromPortalVectors[1]) {
			throw new Error("Could not resolve fromPortalVectors:"+fromPortalVectors);
		}
		let testEdgeVectors = edgeFieldMap.get(triangulation.nextPortal);
		if (testEdgeVectors !== result) throw new Error("Should match!");
		if (!testEdgeVectors[0] || !testEdgeVectors[1]) throw new Error("Should have all vectors!")

		let i;
		let len;
		let fanEdgeFlows;
		if (triangulation.leftEdgeFlows) {
			fanEdgeFlows = triangulation.leftEdgeFlows;
			len = fanEdgeFlows.length;
			for (i=1; i<len; i++) {
				result = this._calcDestPortalField(edgeFlows, fanEdgeFlows[i][1].vertex, null, finalDestPt);
				fanEdgeFlows[i][0] = result[0];
				if (!fanEdgeFlows[i][0] || !fanEdgeFlows[i][1]) {
					throw new Error("Did not fill up fan edge flows...left");
				}
			}
			fanEdgeFlows[0][0] = destResult[0];
			if (!fanEdgeFlows[0][0] || !fanEdgeFlows[0][1]) {
				throw new Error("Did not fill up fan edge flows...left000");
			}
		}

		if (triangulation.rightEdgeFlows) {
			fanEdgeFlows = triangulation.rightEdgeFlows;
			len = fanEdgeFlows.length;
			for (i=1; i<len; i++) {
				result = this._calcDestPortalField(edgeFlows, fanEdgeFlows[i][0].vertex, null, finalDestPt);
				fanEdgeFlows[i][1] = result[1];
				if (!fanEdgeFlows[i][0] || !fanEdgeFlows[i][1]) {
					throw new Error("Did not fill up fan edge flows...right");
				}
			}
			fanEdgeFlows[0][1] = destResult[1];
			if (!fanEdgeFlows[0][0] || !fanEdgeFlows[0][1]) {
				throw new Error("Did not fill up fan edge flows...right000");
			}
		}

	}

	static calcFinalRegionField(region, finalDestPt, edgeFieldMap) {
		const a = CALC_VEC;
		const b = CALC_VEC2;

		// calculate
		if (!edgeFieldMap.has(region.edge.vertex)) {
			edge = region.edge;
			do {
				edgeFieldMap.set(edge.vertex, new FlowVertex(edge.vertex));
				edge = edge.next;
			} while (edge !== region.edge)
		}

		if (!edgeFieldMap.has(finalDestPt)) {
			edgeFieldMap.set(finalDestPt, new FlowVertex(finalDestPt));
		}

		edge = region.edge;
		//let longestTest;
		//let longestLength = 0;

		do {
			flowVertex = edgeFieldMap.get(edge.vertex);
			a.x = edge.vertex.x;
			a.z = edge.vertex.z;
			b.x = finalDestPt.x;
			b.z = finalDestPt.z;
			flowVertex.subVectors(b, a).initFinal(finalDestPt);

			flowVertex.normalize();
			/*
			longestTest = flowVertex.x * flowVertex.x + flowVertex.z * flowVertex.z;
			if (longestTest > longestLength) {
				longestLength = longestTest;
			}
			*/
			edge = edge.next;
		} while(edge !== region.edge)

		/*
		if (longestLength === 0) throw new Error("Exception longest length zero found!");

		longestLength = 1/Math.sqrt(longestLength);

		do {
			flowVertex = edgeFieldMap.get(edge.vertex);
			longestTest = Math.sqrt(flowVertex.x * flowVertex.x + flowVertex.z * flowVertex.z);
			longestTest *= longestLength;
			flowVertex.x *= longestTest;
			flowVertex.z *= longestTest;
			edge = edge.next;
		} while(edge !== region.edge)
		/*/
	}

	getFromNodeIndex(lastRegion, newRegion, pathRef) {
		let startIndex = this.navMesh.getNodeIndex(lastRegion);
		let endIndex = this.navMesh.getNodeIndex(newRegion);
		if (!pathRef) pathRef = this.pathRef;

		if (!Array.isArray(pathRef)) { // Dijkstra assumed pre-searched (ie. source is fill "destination")
			// iterate through all regions to find lowest costs
			let costs = pathRef._cost;
			let tryCost = Infinity;
			let n = startIndex;
			let tryNode;
			let tryEdge;
			let firstEdge = null;

			while(n !== null) {
				let edges = this.navMesh.graph._edges.get( n );
				let len = edges.length;

				tryNode = null;

				for (let i=0; i<len; i++) {

					let toN = edges[i].to;
					if (toN === endIndex) {
						return n;
					}
					if (costs.has(toN) && costs.get(toN) < tryCost) {
						tryCost = costs.get(toN);
						tryNode = toN;
					}
				}

				// early break out continuiuty
				if (tryNode !== null) {
					tryEdge = this.navMesh.regions[n].getEdgeTo(this.navMesh.regions[tryNode]);
					if (firstEdge !== null) {
						n = tryEdge.vertex === firstEdge.vertex || tryEdge.prev.vertex === firstEdge.prev.vertex ? tryNode : null;
					} else {
						firstEdge = tryEdge;
						n = tryNode;
					}
				} else {
					return -1;
				}
			}

			return -1;

		} else {
			var index = pathRef.indexOf(endIndex);
			if (index <= 0) return -1;
			return pathRef[index - 1];
		}
	}

	/**
	 *
	 * @param {Number} fromNode	Node index to originate from (if any). If unspecified, put as -1.
	 * Using this for entering non-tri regions can influence shape of main corridoor triangulation which goes directly (fromNode) to (destination node of node). Using this for entering tri-regions isn't required at all. (use -1)
	 * @param {Number} node	Node index to start from
	 * @param {[Node]|(Dijkstra)} pathRef	Result from getPath(), or pre-searched to destination Dijkstra
	 * @param {Vector3}	finalDestPt	Final destination point for flowfield.
	 * Required if the 'node' is a final node or last-before-final node along pathRef. If unsure, just include it in.
	 * In some cases, this has to be excluded if final destination point is not known or ever-changing per frame, in which case 'node' cannot be the final node along pathRef.
	 * @return {Array} List of edge-flows used in the calculation
	 */
	calcRegionFlow(fromNode, node, pathRef, finalDestPt) {
		if (!pathRef) {
			pathRef = this.pathRef;
			if (!pathRef) throw new Error("calcRegionFlow:: unable to retrieve pathRef!");
		}
		let flowKey = fromNode + "," + node;
		if (this.savedRegionFlows) {
			if (this.savedRegionFlows.has(flowKey)) return this.savedRegionFlows.get(flowKey);
		}

		let region = this.navMesh.regions[node];
		let edgeFieldMap = this.edgeFieldMap;


		edgeFlows = this.getFlowEdges(node, pathRef);

		if (this.savedRegionFlows) {
			this.savedRegionFlows.set(flowKey, edgeFlows);
		}

		if (edgeFlows === null) {
			// could not find path from "node" along pathRef
			return null;
		}


		if (edgeFlows.length === 0) { // asssumed "node" is last region, finalDestPt must be included in order to calculate this
			NavMeshFlowField.calcFinalRegionField(region, finalDestPt, edgeFieldMap);
			return edgeFlows;
		}

		let nextPortal = edgeFlows[0];
		if (!edgeFieldMap.has(nextPortal)) {
			edgeFieldMap.set(nextPortal, [new FlowVertex(nextPortal.vertex), new FlowVertex(nextPortal.prev.vertex)]);
		}

		let fromPortal;
		// fromPortal not required if calculating region flow in triangle node...
		if (region.edge.next.next.next === region.edge) fromPortal = null;
		else fromPortal = fromNode >= 0 ? this.navMesh.regions[fromNode].getEdgeTo(region).twin : null; // determine with node/fromNode (if any);

		if (fromPortal) {
			if (!edgeFieldMap.has(fromPortal)) {
				edgeFieldMap.set(fromPortal, [new FlowVertex(fromPortal.vertex), new FlowVertex(fromPortal.prev.vertex)]);
			}
		}

		// remove finalDestPt reference if not applicable along edgeFlows (ie. last destination node along edgeFLow isn't final destination node)
		if (!this._flowedFinal) finalDestPt = null;

		if (region.edge.next.next.next !== region.edge) {	// >=4ngon region
			//if (fromPortal && this.collinear(fromPortal, nextPortal)) fromPortal = null;
			let triangulation = this.setupTriangulation(null, nextPortal, nextPortal);
			this._calcNonTriRegionField(triangulation, edgeFlows, finalDestPt);
			this.lastTriangulation = triangulation;
		} else {	// triangle region
			this._calcTriRegionField(region, edgeFlows, finalDestPt);
		}

		return edgeFlows;
	}

}

const CALC_VEC$1 = new Vector3();

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
			calcVec = CALC_VEC$1;
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
			calcVec = CALC_VEC$1;
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
			calcVec = CALC_VEC$1;
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

	static pointWithinRegion(pt, curRegion) {
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

const desiredVelocity$3 = new Vector3();

const closestPoint$2=  new Vector3();

const pointOnLineSegment$1 = new Vector3();
const lineSegment$2 = new LineSegment();
function clampPointWithinRegion(region, point) {
	let edge = region.edge;
	let minDistance = Infinity;

	// consider todo: alternate faster implementation with edge perp dot product checks?
	do {
		lineSegment$2.set( edge.prev.vertex, edge.vertex );
		const t = lineSegment$2.closestPointToPointParameter( point );
		lineSegment$2.at( t, pointOnLineSegment$1 );
		const distance = pointOnLineSegment$1.squaredDistanceTo( point );
		if ( distance < minDistance ) {
			minDistance = distance;
			//closestBorderEdge.edge = edge;
			//closestBorderEdge.
			closestPoint$2.copy( pointOnLineSegment$1 );
		}
		edge = edge.next;
	} while (edge !== region.edge);

	return closestPoint$2;
}

/**
* Flowfield behavior through a navmesh
*
* @author Glidias
* @augments SteeringBehavior
*/

class NavMeshFlowFieldBehavior extends SteeringBehavior {

	/**
	 *
	 * @param {NavMeshFlowField} flowField For now, only accepts a persistant NavMeshFLowField. (todo: non-persitant flowfield case)
	 */
	constructor(flowField, finalDestPt, pathRef, epsilon = 1e-3, arrivalDist = 0, arrivalCallback=null) {
		super();
		this.flowField = flowField;
		this.finalDestPt = finalDestPt;
		this.epsilon = epsilon;
		this.pathRef = pathRef;
		this.arrivalSqDist = arrivalDist === 0 ? this.epsilon : arrivalDist;
		this.arrivalSqDist *= this.arrivalSqDist;
		this.arrivalCallback = arrivalCallback;
	}

	onAdded(vehicle) {
		vehicle.agent = new FlowAgent();
	}

	onRemoved(vehicle) {
		vehicle.agent = null;
	}

	calculate( vehicle, force /*, delta */ ) {
		let agent = vehicle.agent;

		desiredVelocity$3.x = 0;
		desiredVelocity$3.z = 0;
		let refPosition = vehicle.position;

		if (agent.lane === false || agent.lane === true) {	// arrival routine
			if (vehicle.position.squaredDistanceTo(this.finalDestPt) < this.arrivalSqDist) {
				if (agent.lane === false) {
					if (this.arrivalCallback !== null) this.arrivalCallback(vehicle);
					agent.lane = true;
				}
			} else {
				agent.calcDir(refPosition, desiredVelocity$3);
			}
			desiredVelocity$3.x *= vehicle.maxSpeed;
			desiredVelocity$3.z *= vehicle.maxSpeed;
			force.x = desiredVelocity$3.x - vehicle.velocity.x;
			force.z = desiredVelocity$3.z - vehicle.velocity.z;
			return force;
		}

		if (!agent.curRegion) {
			this.setCurRegion(vehicle);
			if (!agent.curRegion) {
				force.x = -vehicle.velocity.x;
				force.z = -vehicle.velocity.z;
				return force;
			}
		} else {
			let region;
			if (agent.lane === null) {
				region = agent.getCurRegion();
				if (this.flowField.hasFlowFromRegion(region)) this.setCurRegion(vehicle, region);
				else {
					force.x = -vehicle.velocity.x;
					force.z = -vehicle.velocity.z;
					return force;
				}
			}
			if (!agent.withinCurrentTriangleBounds(refPosition)) {
				region = agent.getCurRegion();
				if ((region.edge.next.next.next !== region.edge && agent.withinCurrentRegionBounds(vehicle.position)) && agent.withinFlowPlane(vehicle.position, this.epsilon) ) {
					// update triangle from triangulation
					agent.curRegion.updateLane(refPosition, agent);
					//console.log("New lane:"+agent.lane);
					agent.curRegion.updateFlowTriLaned(refPosition, agent, this.flowField.edgeFieldMap);
				} else { // doesn't belong to current region
					let lastRegion = agent.curRegion;


					if (this.setCurRegion(vehicle) === false) {
						// ARRIVED
						//vehicle.velocity.x = 0;
						//vehicle.velocity.y = 0;

						agent.lane = false;
						agent.calcDir(refPosition, desiredVelocity$3);
						desiredVelocity$3.x *= vehicle.maxSpeed;
						desiredVelocity$3.z *= vehicle.maxSpeed;

						force.x = desiredVelocity$3.x - vehicle.velocity.x;
						force.z = desiredVelocity$3.z - vehicle.velocity.z;

						return force;
					}

					if (!agent.curRegion) {
						refPosition = clampPointWithinRegion(region, refPosition);
						agent.curRegion = lastRegion;
						if (region.edge.next.next.next !== region.edge && lastRegion !== region) { // 2nd && case for FlowTriangulate
							lastRegion.updateLane(refPosition, agent);
							//console.log("New lane222:"+agent.lane);
							lastRegion.updateFlowTriLaned(refPosition, agent, this.flowField.edgeFieldMap);
						}
					}
				}
			}
		}

		agent.calcDir(refPosition, desiredVelocity$3);

		/*
		if (isNaN(desiredVelocity.x)) {
			console.log([agent.a, agent.b, agent.c, agent.curRegion])
			throw new Error("NaN desired velocity calculated!"+agent.currentTriArea() + " :: "+agent.lane);
		}
		*/

		// desiredVelocity.multiplyScalar( vehicle.maxSpeed );
		desiredVelocity$3.x *= vehicle.maxSpeed;
		desiredVelocity$3.z *= vehicle.maxSpeed;

		// The steering force returned by this method is the force required,
		// which when added to the agent’s current velocity vector gives the desired velocity.
		// To achieve this you simply subtract the agent’s current velocity from the desired velocity.

		//return force.subVectors( desiredVelocity, vehicle.velocity );
		force.x = desiredVelocity$3.x - vehicle.velocity.x;
		force.z = desiredVelocity$3.z - vehicle.velocity.z;
		//force.x = desiredVelocity.x;
		//force.z = desiredVelocity.z;
		return force;
	}

	/**
	 * Set current region based on vehicle's position to vehicle's agent
	 * @param {Vehicle} vehicle The vehicle
	 * @param {Polygon} forceSetRegion (Optional) A region to force a vehicle to be assosiated with, else attempt will search a suitable region on navmesh.
	 *  Setting this parameter to a falsey value that isn't undefined (eg. null) will perform additional within bounds refPosition clamp check.
	 *  WARNING: It is assumed this `forceSetRegion` will be able to reach final destination node
	 * @return {Null|Number|Boolean}
	 * Null if no region could be picked.
	 * True if same region detected from last saved region
	 * False if no flow path could be found due to reaching final destination.
	 * Zero `0` if no flow path  ould be found at all to reach final destination.
	 * One `1` if no flow path could be found (not yet reached final destination).
	 */
	setCurRegion(vehicle, forceSetRegion) {
		let agent = vehicle.agent;
		let flowField = this.flowField;
		let lastRegion = !forceSetRegion ? agent.getCurRegion() : null;
		let regionPicked = !forceSetRegion ? flowField.navMesh.getRegionForPoint(vehicle.position, this.epsilon) : forceSetRegion;
		if (!regionPicked) {
			agent.curRegion = null;
			return null;
		}

		let refPosition = vehicle.position;

		// ensure refPosition clamped is within forceSetRegion
		if (forceSetRegion !== undefined && !FlowAgent.pointWithinRegion(refPosition, regionPicked)) {
			refPosition = clampPointWithinRegion(regionPicked, refPosition);
		}

		if (regionPicked === lastRegion) {
			if (agent.curRegion !== regionPicked) {
				agent.curRegion.updateLane(refPosition, agent);
				agent.curRegion.updateFlowTriLaned(refPosition, agent, flowField.edgeFieldMap);
			}
			return true;
		}

		let lastNodeIndex = lastRegion ? flowField.getFromNodeIndex(lastRegion, regionPicked, this.pathRef) : -1;
		//console.log(lastNodeIndex + ">>>");

		let edgeFlows = flowField.calcRegionFlow(lastNodeIndex, flowField.navMesh.getNodeIndex(regionPicked), this.pathRef, this.finalDestPt);
		if (!edgeFlows) {
			agent.curRegion = null;
			console.log("setCurRegion:: Could not find flow path from current position");
			return 0;
		}

		if (regionPicked.edge.next.next.next === regionPicked.edge) { // triangle
			agent.curRegion = regionPicked;
			if (edgeFlows.length ===0) {
				//console.log("ARRIVED at last triangle region");
				FlowTriangulate.updateNgonFinalTri(regionPicked, refPosition, agent, flowField.edgeFieldMap, this.finalDestPt, this.epsilon);
				return false;
			}
			agent.lane = 0;
			FlowTriangulate.updateTriRegion(agent.curRegion, agent, flowField.edgeFieldMap);
		} else { // non-tri zone
			if (edgeFlows.length === 0) {
				//console.log("ARRIVED at last non-tri region");
				agent.curRegion = regionPicked;
				FlowTriangulate.updateNgonFinalTri(regionPicked, refPosition, agent, flowField.edgeFieldMap, this.finalDestPt, this.epsilon);
				return false;
			}

			/*
			(lastNodeIndex >= 0 ?
					regionPicked.getEdgeTo(flowField.navMesh.regions[lastNodeIndex]) :
					flowField.triangulationMap.get(regionPicked)
			*/
			agent.curRegion = flowField.triangulationMap.get(edgeFlows[0]);


			if (!agent.curRegion) {
				agent.curRegion = flowField.setupTriangulation(null, edgeFlows[0], edgeFlows[0]);
			}
			agent.curRegion.updateLane(refPosition, agent);
			agent.curRegion.updateFlowTriLaned(refPosition, agent, flowField.edgeFieldMap);
		}
		return 1;
	}
}

/**
* Base class for representing tasks. A task is an isolated unit of work that is
* processed in an asynchronous way. Tasks are managed within a {@link TaskQueue task queue}.
*
* @author {@link https://github.com/robp94|robp94}
*/
class Task {

	/**
	* This method represents the actual unit of work.
	* Must be implemented by all concrete tasks.
	*/
	execute() {}

}

/**
* This class is used for task management. Tasks are processed in an asynchronous
* way when there is idle time within a single simulation step or after a defined amount
* of time (deadline). The class is a wrapper around {@link https://w3.org/TR/requestidlecallback|requestidlecallback()},
* a JavaScript API for cooperative scheduling of background tasks.
*
* @author {@link https://github.com/robp94|robp94}
*/
class TaskQueue {

	/**
	* Constructs a new task queue.
	*/
	constructor() {

		/**
		* A list of pending tasks.
		* @type Array
		*/
		this.tasks = new Array();

		/**
		* Used to control the asynchronous processing.
		* - timeout: After this amount of time (in ms), a scheduled task is executed even if
		* doing so risks causing a negative performance impact (e.g. bad frame time).
		* @type Object
		*/
		this.options = {
			timeout: 1000 // ms
		};

		//

		this._active = false;
		this._handler = runTaskQueue.bind( this );
		this._taskHandle = 0;

	}

	/**
	* Adds the given task to the task queue.
	*
	* @param {Task} task - The task to add.
	* @return {TaskQueue} A reference to this task queue.
	*/
	enqueue( task ) {

		this.tasks.push( task );

		return this;

	}

	/**
	* Updates the internal state of the task queue. Should be called
	* per simulation step.
	*
	* @return {TaskQueue} A reference to this task queue.
	*/
	update() {

		if ( this.tasks.length > 0 ) {

			if ( this._active === false ) {

				this._taskHandle = requestIdleCallback( this._handler, this.options );
				this._active = true;

			}

		} else {

			this._active = false;

		}

		return this;

	}

}

/**
* This function controls the processing of tasks. It schedules tasks when there
* is idle time at the end of a simulation step.
*
* @param {Object} deadline - This object contains a function which returns
* a number indicating how much time remains for task processing.
*/
function runTaskQueue( deadline ) {

	const tasks = this.tasks;

	while ( deadline.timeRemaining() > 0 && tasks.length > 0 ) {

		const task = tasks[ 0 ];

		task.execute();

		tasks.shift();

	}

	if ( tasks.length > 0 ) {

		this._taskHandle = requestIdleCallback( this._handler, this.options );
		this._active = true;

	} else {

		this._taskHandle = 0;
		this._active = false;

	}

}

const EPSILON = Math.pow(2, -52);
const EDGE_STACK = new Uint32Array(512);

class Delaunator {

    static from(points, getX = defaultGetX, getY = defaultGetY) {
        const n = points.length;
        const coords = new Float64Array(n * 2);

        for (let i = 0; i < n; i++) {
            const p = points[i];
            coords[2 * i] = getX(p);
            coords[2 * i + 1] = getY(p);
        }

        return new Delaunator(coords);
    }

    constructor(coords) {
        const n = coords.length >> 1;
        if (n > 0 && typeof coords[0] !== 'number') throw new Error('Expected coords to contain numbers.');

        this.coords = coords;

        // arrays that will store the triangulation graph
        const maxTriangles = Math.max(2 * n - 5, 0);
        this._triangles = new Uint32Array(maxTriangles * 3);
        this._halfedges = new Int32Array(maxTriangles * 3);

        // temporary arrays for tracking the edges of the advancing convex hull
        this._hashSize = Math.ceil(Math.sqrt(n));
        this._hullPrev = new Uint32Array(n); // edge to prev edge
        this._hullNext = new Uint32Array(n); // edge to next edge
        this._hullTri = new Uint32Array(n); // edge to adjacent triangle
        this._hullHash = new Int32Array(this._hashSize).fill(-1); // angular edge hash

        // temporary arrays for sorting points
        this._ids = new Uint32Array(n);
        this._dists = new Float64Array(n);

        this.update();
    }

    update() {
        const {coords, _hullPrev: hullPrev, _hullNext: hullNext, _hullTri: hullTri, _hullHash: hullHash} =  this;
        const n = coords.length >> 1;

        // populate an array of point indices; calculate input data bbox
        let minX = Infinity;
        let minY = Infinity;
        let maxX = -Infinity;
        let maxY = -Infinity;

        for (let i = 0; i < n; i++) {
            const x = coords[2 * i];
            const y = coords[2 * i + 1];
            if (x < minX) minX = x;
            if (y < minY) minY = y;
            if (x > maxX) maxX = x;
            if (y > maxY) maxY = y;
            this._ids[i] = i;
        }
        const cx = (minX + maxX) / 2;
        const cy = (minY + maxY) / 2;

        let minDist = Infinity;
        let i0, i1, i2;

        // pick a seed point close to the center
        for (let i = 0; i < n; i++) {
            const d = dist(cx, cy, coords[2 * i], coords[2 * i + 1]);
            if (d < minDist) {
                i0 = i;
                minDist = d;
            }
        }
        const i0x = coords[2 * i0];
        const i0y = coords[2 * i0 + 1];

        minDist = Infinity;

        // find the point closest to the seed
        for (let i = 0; i < n; i++) {
            if (i === i0) continue;
            const d = dist(i0x, i0y, coords[2 * i], coords[2 * i + 1]);
            if (d < minDist && d > 0) {
                i1 = i;
                minDist = d;
            }
        }
        let i1x = coords[2 * i1];
        let i1y = coords[2 * i1 + 1];

        let minRadius = Infinity;

        // find the third point which forms the smallest circumcircle with the first two
        for (let i = 0; i < n; i++) {
            if (i === i0 || i === i1) continue;
            const r = circumradius(i0x, i0y, i1x, i1y, coords[2 * i], coords[2 * i + 1]);
            if (r < minRadius) {
                i2 = i;
                minRadius = r;
            }
        }
        let i2x = coords[2 * i2];
        let i2y = coords[2 * i2 + 1];

        if (minRadius === Infinity) {
            // order collinear points by dx (or dy if all x are identical)
            // and return the list as a hull
            for (let i = 0; i < n; i++) {
                this._dists[i] = (coords[2 * i] - coords[0]) || (coords[2 * i + 1] - coords[1]);
            }
            quicksort(this._ids, this._dists, 0, n - 1);
            const hull = new Uint32Array(n);
            let j = 0;
            for (let i = 0, d0 = -Infinity; i < n; i++) {
                const id = this._ids[i];
                if (this._dists[id] > d0) {
                    hull[j++] = id;
                    d0 = this._dists[id];
                }
            }
            this.hull = hull.subarray(0, j);
            this.triangles = new Uint32Array(0);
            this.halfedges = new Uint32Array(0);
            return;
        }

        // swap the order of the seed points for counter-clockwise orientation
        if (orient(i0x, i0y, i1x, i1y, i2x, i2y)) {
            const i = i1;
            const x = i1x;
            const y = i1y;
            i1 = i2;
            i1x = i2x;
            i1y = i2y;
            i2 = i;
            i2x = x;
            i2y = y;
        }

        const center = circumcenter(i0x, i0y, i1x, i1y, i2x, i2y);
        this._cx = center.x;
        this._cy = center.y;

        for (let i = 0; i < n; i++) {
            this._dists[i] = dist(coords[2 * i], coords[2 * i + 1], center.x, center.y);
        }

        // sort the points by distance from the seed triangle circumcenter
        quicksort(this._ids, this._dists, 0, n - 1);

        // set up the seed triangle as the starting hull
        this._hullStart = i0;
        let hullSize = 3;

        hullNext[i0] = hullPrev[i2] = i1;
        hullNext[i1] = hullPrev[i0] = i2;
        hullNext[i2] = hullPrev[i1] = i0;

        hullTri[i0] = 0;
        hullTri[i1] = 1;
        hullTri[i2] = 2;

        hullHash.fill(-1);
        hullHash[this._hashKey(i0x, i0y)] = i0;
        hullHash[this._hashKey(i1x, i1y)] = i1;
        hullHash[this._hashKey(i2x, i2y)] = i2;

        this.trianglesLen = 0;
        this._addTriangle(i0, i1, i2, -1, -1, -1);

        for (let k = 0, xp, yp; k < this._ids.length; k++) {
            const i = this._ids[k];
            const x = coords[2 * i];
            const y = coords[2 * i + 1];

            // skip near-duplicate points
            if (k > 0 && Math.abs(x - xp) <= EPSILON && Math.abs(y - yp) <= EPSILON) continue;
            xp = x;
            yp = y;

            // skip seed triangle points
            if (i === i0 || i === i1 || i === i2) continue;

            // find a visible edge on the convex hull using edge hash
            let start = 0;
            for (let j = 0, key = this._hashKey(x, y); j < this._hashSize; j++) {
                start = hullHash[(key + j) % this._hashSize];
                if (start !== -1 && start !== hullNext[start]) break;
            }

            start = hullPrev[start];
            let e = start, q;
            while (q = hullNext[e], !orient(x, y, coords[2 * e], coords[2 * e + 1], coords[2 * q], coords[2 * q + 1])) {
                e = q;
                if (e === start) {
                    e = -1;
                    break;
                }
            }
            if (e === -1) continue; // likely a near-duplicate point; skip it

            // add the first triangle from the point
            let t = this._addTriangle(e, i, hullNext[e], -1, -1, hullTri[e]);

            // recursively flip triangles from the point until they satisfy the Delaunay condition
            hullTri[i] = this._legalize(t + 2);
            hullTri[e] = t; // keep track of boundary triangles on the hull
            hullSize++;

            // walk forward through the hull, adding more triangles and flipping recursively
            let n = hullNext[e];
            while (q = hullNext[n], orient(x, y, coords[2 * n], coords[2 * n + 1], coords[2 * q], coords[2 * q + 1])) {
                t = this._addTriangle(n, i, q, hullTri[i], -1, hullTri[n]);
                hullTri[i] = this._legalize(t + 2);
                hullNext[n] = n; // mark as removed
                hullSize--;
                n = q;
            }

            // walk backward from the other side, adding more triangles and flipping
            if (e === start) {
                while (q = hullPrev[e], orient(x, y, coords[2 * q], coords[2 * q + 1], coords[2 * e], coords[2 * e + 1])) {
                    t = this._addTriangle(q, i, e, -1, hullTri[e], hullTri[q]);
                    this._legalize(t + 2);
                    hullTri[q] = t;
                    hullNext[e] = e; // mark as removed
                    hullSize--;
                    e = q;
                }
            }

            // update the hull indices
            this._hullStart = hullPrev[i] = e;
            hullNext[e] = hullPrev[n] = i;
            hullNext[i] = n;

            // save the two new edges in the hash table
            hullHash[this._hashKey(x, y)] = i;
            hullHash[this._hashKey(coords[2 * e], coords[2 * e + 1])] = e;
        }

        this.hull = new Uint32Array(hullSize);
        for (let i = 0, e = this._hullStart; i < hullSize; i++) {
            this.hull[i] = e;
            e = hullNext[e];
        }

        // trim typed triangle mesh arrays
        this.triangles = this._triangles.subarray(0, this.trianglesLen);
        this.halfedges = this._halfedges.subarray(0, this.trianglesLen);
    }

    _hashKey(x, y) {
        return Math.floor(pseudoAngle(x - this._cx, y - this._cy) * this._hashSize) % this._hashSize;
    }

    _legalize(a) {
        const {_triangles: triangles, _halfedges: halfedges, coords} = this;

        let i = 0;
        let ar = 0;

        // recursion eliminated with a fixed-size stack
        while (true) {
            const b = halfedges[a];

            /* if the pair of triangles doesn't satisfy the Delaunay condition
             * (p1 is inside the circumcircle of [p0, pl, pr]), flip them,
             * then do the same check/flip recursively for the new pair of triangles
             *
             *           pl                    pl
             *          /||\                  /  \
             *       al/ || \bl            al/    \a
             *        /  ||  \              /      \
             *       /  a||b  \    flip    /___ar___\
             *     p0\   ||   /p1   =>   p0\---bl---/p1
             *        \  ||  /              \      /
             *       ar\ || /br             b\    /br
             *          \||/                  \  /
             *           pr                    pr
             */
            const a0 = a - a % 3;
            ar = a0 + (a + 2) % 3;

            if (b === -1) { // convex hull edge
                if (i === 0) break;
                a = EDGE_STACK[--i];
                continue;
            }

            const b0 = b - b % 3;
            const al = a0 + (a + 1) % 3;
            const bl = b0 + (b + 2) % 3;

            const p0 = triangles[ar];
            const pr = triangles[a];
            const pl = triangles[al];
            const p1 = triangles[bl];

            const illegal = inCircle(
                coords[2 * p0], coords[2 * p0 + 1],
                coords[2 * pr], coords[2 * pr + 1],
                coords[2 * pl], coords[2 * pl + 1],
                coords[2 * p1], coords[2 * p1 + 1]);

            if (illegal) {
                triangles[a] = p1;
                triangles[b] = p0;

                const hbl = halfedges[bl];

                // edge swapped on the other side of the hull (rare); fix the halfedge reference
                if (hbl === -1) {
                    let e = this._hullStart;
                    do {
                        if (this._hullTri[e] === bl) {
                            this._hullTri[e] = a;
                            break;
                        }
                        e = this._hullPrev[e];
                    } while (e !== this._hullStart);
                }
                this._link(a, hbl);
                this._link(b, halfedges[ar]);
                this._link(ar, bl);

                const br = b0 + (b + 1) % 3;

                // don't worry about hitting the cap: it can only happen on extremely degenerate input
                if (i < EDGE_STACK.length) {
                    EDGE_STACK[i++] = br;
                }
            } else {
                if (i === 0) break;
                a = EDGE_STACK[--i];
            }
        }

        return ar;
    }

    _link(a, b) {
        this._halfedges[a] = b;
        if (b !== -1) this._halfedges[b] = a;
    }

    // add a new triangle given vertex indices and adjacent half-edge ids
    _addTriangle(i0, i1, i2, a, b, c) {
        const t = this.trianglesLen;

        this._triangles[t] = i0;
        this._triangles[t + 1] = i1;
        this._triangles[t + 2] = i2;

        this._link(t, a);
        this._link(t + 1, b);
        this._link(t + 2, c);

        this.trianglesLen += 3;

        return t;
    }
}

// monotonically increases with real angle, but doesn't need expensive trigonometry
function pseudoAngle(dx, dy) {
    const p = dx / (Math.abs(dx) + Math.abs(dy));
    return (dy > 0 ? 3 - p : 1 + p) / 4; // [0..1]
}

function dist(ax, ay, bx, by) {
    const dx = ax - bx;
    const dy = ay - by;
    return dx * dx + dy * dy;
}

// return 2d orientation sign if we're confident in it through J. Shewchuk's error bound check
function orientIfSure(px, py, rx, ry, qx, qy) {
    const l = (ry - py) * (qx - px);
    const r = (rx - px) * (qy - py);
    return Math.abs(l - r) >= 3.3306690738754716e-16 * Math.abs(l + r) ? l - r : 0;
}

// a more robust orientation test that's stable in a given triangle (to fix robustness issues)
function orient(rx, ry, qx, qy, px, py) {
    const sign = orientIfSure(px, py, rx, ry, qx, qy) ||
    orientIfSure(rx, ry, qx, qy, px, py) ||
    orientIfSure(qx, qy, px, py, rx, ry);
    return sign < 0;
}

function inCircle(ax, ay, bx, by, cx, cy, px, py) {
    const dx = ax - px;
    const dy = ay - py;
    const ex = bx - px;
    const ey = by - py;
    const fx = cx - px;
    const fy = cy - py;

    const ap = dx * dx + dy * dy;
    const bp = ex * ex + ey * ey;
    const cp = fx * fx + fy * fy;

    return dx * (ey * cp - bp * fy) -
           dy * (ex * cp - bp * fx) +
           ap * (ex * fy - ey * fx) < 0;
}

function circumradius(ax, ay, bx, by, cx, cy) {
    const dx = bx - ax;
    const dy = by - ay;
    const ex = cx - ax;
    const ey = cy - ay;

    const bl = dx * dx + dy * dy;
    const cl = ex * ex + ey * ey;
    const d = 0.5 / (dx * ey - dy * ex);

    const x = (ey * bl - dy * cl) * d;
    const y = (dx * cl - ex * bl) * d;

    return x * x + y * y;
}

function circumcenter(ax, ay, bx, by, cx, cy) {
    const dx = bx - ax;
    const dy = by - ay;
    const ex = cx - ax;
    const ey = cy - ay;

    const bl = dx * dx + dy * dy;
    const cl = ex * ex + ey * ey;
    const d = 0.5 / (dx * ey - dy * ex);

    const x = ax + (ey * bl - dy * cl) * d;
    const y = ay + (dx * cl - ex * bl) * d;

    return {x, y};
}

function quicksort(ids, dists, left, right) {
    if (right - left <= 20) {
        for (let i = left + 1; i <= right; i++) {
            const temp = ids[i];
            const tempDist = dists[temp];
            let j = i - 1;
            while (j >= left && dists[ids[j]] > tempDist) ids[j + 1] = ids[j--];
            ids[j + 1] = temp;
        }
    } else {
        const median = (left + right) >> 1;
        let i = left + 1;
        let j = right;
        swap(ids, median, i);
        if (dists[ids[left]] > dists[ids[right]]) swap(ids, left, right);
        if (dists[ids[i]] > dists[ids[right]]) swap(ids, i, right);
        if (dists[ids[left]] > dists[ids[i]]) swap(ids, left, i);

        const temp = ids[i];
        const tempDist = dists[temp];
        while (true) {
            do i++; while (dists[ids[i]] < tempDist);
            do j--; while (dists[ids[j]] > tempDist);
            if (j < i) break;
            swap(ids, i, j);
        }
        ids[left + 1] = ids[j];
        ids[j] = temp;

        if (right - i + 1 >= j - left) {
            quicksort(ids, dists, i, right);
            quicksort(ids, dists, left, j - 1);
        } else {
            quicksort(ids, dists, left, j - 1);
            quicksort(ids, dists, i, right);
        }
    }
}

function swap(arr, i, j) {
    const tmp = arr[i];
    arr[i] = arr[j];
    arr[j] = tmp;
}

function defaultGetX(p) {
    return p[0];
}
function defaultGetY(p) {
    return p[1];
}

const epsilon = 1e-6;

class Path$1 {
  constructor() {
    this._x0 = this._y0 = // start of current subpath
    this._x1 = this._y1 = null; // end of current subpath
    this._ = "";
  }
  moveTo(x, y) {
    this._ += `M${this._x0 = this._x1 = +x},${this._y0 = this._y1 = +y}`;
  }
  closePath() {
    if (this._x1 !== null) {
      this._x1 = this._x0, this._y1 = this._y0;
      this._ += "Z";
    }
  }
  lineTo(x, y) {
    this._ += `L${this._x1 = +x},${this._y1 = +y}`;
  }
  arc(x, y, r) {
    x = +x, y = +y, r = +r;
    const x0 = x + r;
    const y0 = y;
    if (r < 0) throw new Error("negative radius");
    if (this._x1 === null) this._ += `M${x0},${y0}`;
    else if (Math.abs(this._x1 - x0) > epsilon || Math.abs(this._y1 - y0) > epsilon) this._ += "L" + x0 + "," + y0;
    if (!r) return;
    this._ += `A${r},${r},0,1,1,${x - r},${y}A${r},${r},0,1,1,${this._x1 = x0},${this._y1 = y0}`;
  }
  rect(x, y, w, h) {
    this._ += `M${this._x0 = this._x1 = +x},${this._y0 = this._y1 = +y}h${+w}v${+h}h${-w}Z`;
  }
  value() {
    return this._ || null;
  }
}

class Polygon$1 {
  constructor() {
    this._ = [];
  }
  moveTo(x, y) {
    this._.push([x, y]);
  }
  closePath() {
    this._.push(this._[0].slice());
  }
  lineTo(x, y) {
    this._.push([x, y]);
  }
  value() {
    return this._.length ? this._ : null;
  }
}

class Voronoi {
  constructor(delaunay, [xmin, ymin, xmax, ymax] = [0, 0, 960, 500]) {
    if (!((xmax = +xmax) >= (xmin = +xmin)) || !((ymax = +ymax) >= (ymin = +ymin))) throw new Error("invalid bounds");
    this.delaunay = delaunay;
    this._circumcenters = new Float64Array(delaunay.points.length * 2);
    this.vectors = new Float64Array(delaunay.points.length * 2);
    this.xmax = xmax, this.xmin = xmin;
    this.ymax = ymax, this.ymin = ymin;
    this._init();
  }
  update() {
    this.delaunay.update();
    this._init();
    return this;
  }
  _init() {
    const {delaunay: {points, hull, triangles}, vectors} = this;

    // Compute circumcenters.
    const circumcenters = this.circumcenters = this._circumcenters.subarray(0, triangles.length / 3 * 2);
    for (let i = 0, j = 0, n = triangles.length, x, y; i < n; i += 3, j += 2) {
      const t1 = triangles[i] * 2;
      const t2 = triangles[i + 1] * 2;
      const t3 = triangles[i + 2] * 2;
      const x1 = points[t1];
      const y1 = points[t1 + 1];
      const x2 = points[t2];
      const y2 = points[t2 + 1];
      const x3 = points[t3];
      const y3 = points[t3 + 1];

      const dx = x2 - x1;
      const dy = y2 - y1;
      const ex = x3 - x1;
      const ey = y3 - y1;
      const bl = dx * dx + dy * dy;
      const cl = ex * ex + ey * ey;
      const ab = (dx * ey - dy * ex) * 2;

      if (!ab) {
        // degenerate case (collinear diagram)
        x = (x1 + x3) / 2 - 1e8 * ey;
        y = (y1 + y3) / 2 + 1e8 * ex;
      }
      else if (Math.abs(ab) < 1e-8) {
        // almost equal points (degenerate triangle)
        x = (x1 + x3) / 2;
        y = (y1 + y3) / 2;
      } else {
        const d = 1 / ab;
        x = x1 + (ey * bl - dy * cl) * d;
        y = y1 + (dx * cl - ex * bl) * d;
      }
      circumcenters[j] = x;
      circumcenters[j + 1] = y;
    }

    // Compute exterior cell rays.
    let h = hull[hull.length - 1];
    let p0, p1 = h * 4;
    let x0, x1 = points[2 * h];
    let y0, y1 = points[2 * h + 1];
    vectors.fill(0);
    for (let i = 0; i < hull.length; ++i) {
      h = hull[i];
      p0 = p1, x0 = x1, y0 = y1;
      p1 = h * 4, x1 = points[2 * h], y1 = points[2 * h + 1];
      vectors[p0 + 2] = vectors[p1] = y0 - y1;
      vectors[p0 + 3] = vectors[p1 + 1] = x1 - x0;
    }
  }
  render(context) {
    const buffer = context == null ? context = new Path$1 : undefined;
    const {delaunay: {halfedges, inedges, hull}, circumcenters, vectors} = this;
    if (hull.length <= 1) return null;
    for (let i = 0, n = halfedges.length; i < n; ++i) {
      const j = halfedges[i];
      if (j < i) continue;
      const ti = Math.floor(i / 3) * 2;
      const tj = Math.floor(j / 3) * 2;
      const xi = circumcenters[ti];
      const yi = circumcenters[ti + 1];
      const xj = circumcenters[tj];
      const yj = circumcenters[tj + 1];
      this._renderSegment(xi, yi, xj, yj, context);
    }
    let h0, h1 = hull[hull.length - 1];
    for (let i = 0; i < hull.length; ++i) {
      h0 = h1, h1 = hull[i];
      const t = Math.floor(inedges[h1] / 3) * 2;
      const x = circumcenters[t];
      const y = circumcenters[t + 1];
      const v = h0 * 4;
      const p = this._project(x, y, vectors[v + 2], vectors[v + 3]);
      if (p) this._renderSegment(x, y, p[0], p[1], context);
    }
    return buffer && buffer.value();
  }
  renderBounds(context) {
    const buffer = context == null ? context = new Path$1 : undefined;
    context.rect(this.xmin, this.ymin, this.xmax - this.xmin, this.ymax - this.ymin);
    return buffer && buffer.value();
  }
  renderCell(i, context) {
    const buffer = context == null ? context = new Path$1 : undefined;
    const points = this._clip(i);
    if (points === null) return;
    context.moveTo(points[0], points[1]);
    let n = points.length;
    while (points[0] === points[n-2] && points[1] === points[n-1] && n > 1) n -= 2;
    for (let i = 2; i < n; i += 2) {
      if (points[i] !== points[i-2] || points[i+1] !== points[i-1])
        context.lineTo(points[i], points[i + 1]);
    }
    context.closePath();
    return buffer && buffer.value();
  }
  *cellPolygons() {
    const {delaunay: {points}} = this;
    for (let i = 0, n = points.length / 2; i < n; ++i) {
      const cell = this.cellPolygon(i);
      if (cell) yield cell;
    }
  }
  cellPolygon(i) {
    const polygon = new Polygon$1;
    this.renderCell(i, polygon);
    return polygon.value();
  }
  _renderSegment(x0, y0, x1, y1, context) {
    let S;
    const c0 = this._regioncode(x0, y0);
    const c1 = this._regioncode(x1, y1);
    if (c0 === 0 && c1 === 0) {
      context.moveTo(x0, y0);
      context.lineTo(x1, y1);
    } else if (S = this._clipSegment(x0, y0, x1, y1, c0, c1)) {
      context.moveTo(S[0], S[1]);
      context.lineTo(S[2], S[3]);
    }
  }
  contains(i, x, y) {
    if ((x = +x, x !== x) || (y = +y, y !== y)) return false;
    return this.delaunay._step(i, x, y) === i;
  }
  _cell(i) {
    const {circumcenters, delaunay: {inedges, halfedges, triangles}} = this;
    const e0 = inedges[i];
    if (e0 === -1) return null; // coincident point
    const points = [];
    let e = e0;
    do {
      const t = Math.floor(e / 3);
      points.push(circumcenters[t * 2], circumcenters[t * 2 + 1]);
      e = e % 3 === 2 ? e - 2 : e + 1;
      if (triangles[e] !== i) break; // bad triangulation
      e = halfedges[e];
    } while (e !== e0 && e !== -1);
    return points;
  }
  _clip(i) {
    // degenerate case (1 valid point: return the box)
    if (i === 0 && this.delaunay.hull.length === 1) {
      return [this.xmax, this.ymin, this.xmax, this.ymax, this.xmin, this.ymax, this.xmin, this.ymin];
    }
    const points = this._cell(i);
    if (points === null) return null;
    const {vectors: V} = this;
    const v = i * 4;
    return V[v] || V[v + 1]
        ? this._clipInfinite(i, points, V[v], V[v + 1], V[v + 2], V[v + 3])
        : this._clipFinite(i, points);
  }
  _clipFinite(i, points) {
    const n = points.length;
    let P = null;
    let x0, y0, x1 = points[n - 2], y1 = points[n - 1];
    let c0, c1 = this._regioncode(x1, y1);
    let e0, e1;
    for (let j = 0; j < n; j += 2) {
      x0 = x1, y0 = y1, x1 = points[j], y1 = points[j + 1];
      c0 = c1, c1 = this._regioncode(x1, y1);
      if (c0 === 0 && c1 === 0) {
        e0 = e1, e1 = 0;
        if (P) P.push(x1, y1);
        else P = [x1, y1];
      } else {
        let S, sx0, sy0, sx1, sy1;
        if (c0 === 0) {
          if ((S = this._clipSegment(x0, y0, x1, y1, c0, c1)) === null) continue;
          [sx0, sy0, sx1, sy1] = S;
        } else {
          if ((S = this._clipSegment(x1, y1, x0, y0, c1, c0)) === null) continue;
          [sx1, sy1, sx0, sy0] = S;
          e0 = e1, e1 = this._edgecode(sx0, sy0);
          if (e0 && e1) this._edge(i, e0, e1, P, P.length);
          if (P) P.push(sx0, sy0);
          else P = [sx0, sy0];
        }
        e0 = e1, e1 = this._edgecode(sx1, sy1);
        if (e0 && e1) this._edge(i, e0, e1, P, P.length);
        if (P) P.push(sx1, sy1);
        else P = [sx1, sy1];
      }
    }
    if (P) {
      e0 = e1, e1 = this._edgecode(P[0], P[1]);
      if (e0 && e1) this._edge(i, e0, e1, P, P.length);
    } else if (this.contains(i, (this.xmin + this.xmax) / 2, (this.ymin + this.ymax) / 2)) {
      return [this.xmax, this.ymin, this.xmax, this.ymax, this.xmin, this.ymax, this.xmin, this.ymin];
    }
    return P;
  }
  _clipSegment(x0, y0, x1, y1, c0, c1) {
    while (true) {
      if (c0 === 0 && c1 === 0) return [x0, y0, x1, y1];
      if (c0 & c1) return null;
      let x, y, c = c0 || c1;
      if (c & 0b1000) x = x0 + (x1 - x0) * (this.ymax - y0) / (y1 - y0), y = this.ymax;
      else if (c & 0b0100) x = x0 + (x1 - x0) * (this.ymin - y0) / (y1 - y0), y = this.ymin;
      else if (c & 0b0010) y = y0 + (y1 - y0) * (this.xmax - x0) / (x1 - x0), x = this.xmax;
      else y = y0 + (y1 - y0) * (this.xmin - x0) / (x1 - x0), x = this.xmin;
      if (c0) x0 = x, y0 = y, c0 = this._regioncode(x0, y0);
      else x1 = x, y1 = y, c1 = this._regioncode(x1, y1);
    }
  }
  _clipInfinite(i, points, vx0, vy0, vxn, vyn) {
    let P = Array.from(points), p;
    if (p = this._project(P[0], P[1], vx0, vy0)) P.unshift(p[0], p[1]);
    if (p = this._project(P[P.length - 2], P[P.length - 1], vxn, vyn)) P.push(p[0], p[1]);
    if (P = this._clipFinite(i, P)) {
      for (let j = 0, n = P.length, c0, c1 = this._edgecode(P[n - 2], P[n - 1]); j < n; j += 2) {
        c0 = c1, c1 = this._edgecode(P[j], P[j + 1]);
        if (c0 && c1) j = this._edge(i, c0, c1, P, j), n = P.length;
      }
    } else if (this.contains(i, (this.xmin + this.xmax) / 2, (this.ymin + this.ymax) / 2)) {
      P = [this.xmin, this.ymin, this.xmax, this.ymin, this.xmax, this.ymax, this.xmin, this.ymax];
    }
    return P;
  }
  _edge(i, e0, e1, P, j) {
    while (e0 !== e1) {
      let x, y;
      switch (e0) {
        case 0b0101: e0 = 0b0100; continue; // top-left
        case 0b0100: e0 = 0b0110, x = this.xmax, y = this.ymin; break; // top
        case 0b0110: e0 = 0b0010; continue; // top-right
        case 0b0010: e0 = 0b1010, x = this.xmax, y = this.ymax; break; // right
        case 0b1010: e0 = 0b1000; continue; // bottom-right
        case 0b1000: e0 = 0b1001, x = this.xmin, y = this.ymax; break; // bottom
        case 0b1001: e0 = 0b0001; continue; // bottom-left
        case 0b0001: e0 = 0b0101, x = this.xmin, y = this.ymin; break; // left
      }
      if ((P[j] !== x || P[j + 1] !== y) && this.contains(i, x, y)) {
        P.splice(j, 0, x, y), j += 2;
      }
    }
    if (P.length > 4) {
      for (let i = 0; i < P.length; i+= 2) {
        const j = (i + 2) % P.length, k = (i + 4) % P.length;
        if (P[i] === P[j] && P[j] === P[k]
        || P[i + 1] === P[j + 1] && P[j + 1] === P[k + 1])
          P.splice(j, 2), i -= 2;
      }
    }
    return j;
  }
  _project(x0, y0, vx, vy) {
    let t = Infinity, c, x, y;
    if (vy < 0) { // top
      if (y0 <= this.ymin) return null;
      if ((c = (this.ymin - y0) / vy) < t) y = this.ymin, x = x0 + (t = c) * vx;
    } else if (vy > 0) { // bottom
      if (y0 >= this.ymax) return null;
      if ((c = (this.ymax - y0) / vy) < t) y = this.ymax, x = x0 + (t = c) * vx;
    }
    if (vx > 0) { // right
      if (x0 >= this.xmax) return null;
      if ((c = (this.xmax - x0) / vx) < t) x = this.xmax, y = y0 + (t = c) * vy;
    } else if (vx < 0) { // left
      if (x0 <= this.xmin) return null;
      if ((c = (this.xmin - x0) / vx) < t) x = this.xmin, y = y0 + (t = c) * vy;
    }
    return [x, y];
  }
  _edgecode(x, y) {
    return (x === this.xmin ? 0b0001
        : x === this.xmax ? 0b0010 : 0b0000)
        | (y === this.ymin ? 0b0100
        : y === this.ymax ? 0b1000 : 0b0000);
  }
  _regioncode(x, y) {
    return (x < this.xmin ? 0b0001
        : x > this.xmax ? 0b0010 : 0b0000)
        | (y < this.ymin ? 0b0100
        : y > this.ymax ? 0b1000 : 0b0000);
  }
}

const tau = 2 * Math.PI;

function pointX(p) {
  return p[0];
}

function pointY(p) {
  return p[1];
}

function area(hull, points) {
  let n = hull.length, x0, y0,
      x1 = points[2 * hull[n - 1]],
      y1 = points[2 * hull[n - 1] + 1],
      area = 0;

  for (let i = 0; i < n; i ++) {
    x0 = x1, y0 = y1;
    x1 = points[2 * hull[i]];
    y1 = points[2 * hull[i] + 1];
    area += y0 * x1 - x0 * y1;
  }

  return area / 2;
}

function jitter(x, y, r) {
  return [x + Math.sin(x + y) * r, y + Math.cos(x - y) * r];
}

class Delaunay {
  constructor(points) {
    this._delaunator = new Delaunator(points);
    this.inedges = new Int32Array(points.length / 2);
    this._hullIndex = new Int32Array(points.length / 2);
    this.points = this._delaunator.coords;
    this._init();
  }
  update() {
    this._delaunator.update();
    this._init();
    return this;
  }
  _init() {
    const d = this._delaunator, points = this.points;

    // check for collinear
    if (d.hull && d.hull.length > 2 && area(d.hull, points) < 1e-10) {
      this.collinear = Int32Array.from({length: points.length/2}, (_,i) => i)
        .sort((i, j) => points[2 * i] - points[2 * j] || points[2 * i + 1] - points[2 * j + 1]); // for exact neighbors
      const e = this.collinear[0], f = this.collinear[this.collinear.length - 1],
        bounds = [ points[2 * e], points[2 * e + 1], points[2 * f], points[2 * f + 1] ],
        r = 1e-8 * Math.sqrt((bounds[3] - bounds[1])**2 + (bounds[2] - bounds[0])**2);
      for (let i = 0, n = points.length / 2; i < n; ++i) {
        const p = jitter(points[2 * i], points[2 * i + 1], r);
        points[2 * i] = p[0];
        points[2 * i + 1] = p[1];
      }
      this._delaunator = new Delaunator(points);
    } else {
      delete this.collinear;
    }

    const halfedges = this.halfedges = this._delaunator.halfedges;
    const hull = this.hull = this._delaunator.hull;
    const triangles = this.triangles = this._delaunator.triangles;
    const inedges = this.inedges.fill(-1);
    const hullIndex = this._hullIndex.fill(-1);

    // Compute an index from each point to an (arbitrary) incoming halfedge
    // Used to give the first neighbor of each point; for this reason,
    // on the hull we give priority to exterior halfedges
    for (let e = 0, n = halfedges.length; e < n; ++e) {
      const p = triangles[e % 3 === 2 ? e - 2 : e + 1];
      if (halfedges[e] === -1 || inedges[p] === -1) inedges[p] = e;
    }
    for (let i = 0, n = hull.length; i < n; ++i) {
      hullIndex[hull[i]] = i;
    }

    // degenerate case: 1 or 2 (distinct) points
    if (hull.length <= 2 && hull.length > 0) {
      this.triangles = new Int32Array(3).fill(-1);
      this.halfedges = new Int32Array(3).fill(-1);
      this.triangles[0] = hull[0];
      this.triangles[1] = hull[1];
      this.triangles[2] = hull[1];
      inedges[hull[0]] = 1;
      if (hull.length === 2) inedges[hull[1]] = 0;
    }
  }
  voronoi(bounds) {
    return new Voronoi(this, bounds);
  }
  *neighbors(i) {
    const {inedges, hull, _hullIndex, halfedges, triangles} = this;

    // degenerate case with several collinear points
    if (this.collinear) {
      const l = this.collinear.indexOf(i);
      if (l > 0) yield this.collinear[l - 1];
      if (l < this.collinear.length - 1) yield this.collinear[l + 1];
      return;
    }

    const e0 = inedges[i];
    if (e0 === -1) return; // coincident point
    let e = e0, p0 = -1;
    do {
      yield p0 = triangles[e];
      e = e % 3 === 2 ? e - 2 : e + 1;
      if (triangles[e] !== i) return; // bad triangulation
      e = halfedges[e];
      if (e === -1) {
        const p = hull[(_hullIndex[i] + 1) % hull.length];
        if (p !== p0) yield p;
        return;
      }
    } while (e !== e0);
  }
  find(x, y, i = 0) {
    if ((x = +x, x !== x) || (y = +y, y !== y)) return -1;
    const i0 = i;
    let c;
    while ((c = this._step(i, x, y)) >= 0 && c !== i && c !== i0) i = c;
    return c;
  }
  _step(i, x, y) {
    const {inedges, hull, _hullIndex, halfedges, triangles, points} = this;
    if (inedges[i] === -1 || !points.length) return (i + 1) % (points.length >> 1);
    let c = i;
    let dc = (x - points[i * 2]) ** 2 + (y - points[i * 2 + 1]) ** 2;
    const e0 = inedges[i];
    let e = e0;
    do {
      let t = triangles[e];
      const dt = (x - points[t * 2]) ** 2 + (y - points[t * 2 + 1]) ** 2;
      if (dt < dc) dc = dt, c = t;
      e = e % 3 === 2 ? e - 2 : e + 1;
      if (triangles[e] !== i) break; // bad triangulation
      e = halfedges[e];
      if (e === -1) {
        e = hull[(_hullIndex[i] + 1) % hull.length];
        if (e !== t) {
          if ((x - points[e * 2]) ** 2 + (y - points[e * 2 + 1]) ** 2 < dc) return e;
        }
        break;
      }
    } while (e !== e0);
    return c;
  }
  render(context) {
    const buffer = context == null ? context = new Path$1 : undefined;
    const {points, halfedges, triangles} = this;
    for (let i = 0, n = halfedges.length; i < n; ++i) {
      const j = halfedges[i];
      if (j < i) continue;
      const ti = triangles[i] * 2;
      const tj = triangles[j] * 2;
      context.moveTo(points[ti], points[ti + 1]);
      context.lineTo(points[tj], points[tj + 1]);
    }
    this.renderHull(context);
    return buffer && buffer.value();
  }
  renderPoints(context, r = 2) {
    const buffer = context == null ? context = new Path$1 : undefined;
    const {points} = this;
    for (let i = 0, n = points.length; i < n; i += 2) {
      const x = points[i], y = points[i + 1];
      context.moveTo(x + r, y);
      context.arc(x, y, r, 0, tau);
    }
    return buffer && buffer.value();
  }
  renderHull(context) {
    const buffer = context == null ? context = new Path$1 : undefined;
    const {hull, points} = this;
    const h = hull[0] * 2, n = hull.length;
    context.moveTo(points[h], points[h + 1]);
    for (let i = 1; i < n; ++i) {
      const h = 2 * hull[i];
      context.lineTo(points[h], points[h + 1]);
    }
    context.closePath();
    return buffer && buffer.value();
  }
  hullPolygon() {
    const polygon = new Polygon$1;
    this.renderHull(polygon);
    return polygon.value();
  }
  renderTriangle(i, context) {
    const buffer = context == null ? context = new Path$1 : undefined;
    const {points, triangles} = this;
    const t0 = triangles[i *= 3] * 2;
    const t1 = triangles[i + 1] * 2;
    const t2 = triangles[i + 2] * 2;
    context.moveTo(points[t0], points[t0 + 1]);
    context.lineTo(points[t1], points[t1 + 1]);
    context.lineTo(points[t2], points[t2 + 1]);
    context.closePath();
    return buffer && buffer.value();
  }
  *trianglePolygons() {
    const {triangles} = this;
    for (let i = 0, n = triangles.length / 3; i < n; ++i) {
      yield this.trianglePolygon(i);
    }
  }
  trianglePolygon(i) {
    const polygon = new Polygon$1;
    this.renderTriangle(i, polygon);
    return polygon.value();
  }
}

Delaunay.from = function(points, fx = pointX, fy = pointY, that) {
  return new Delaunay("length" in points
      ? flatArray(points, fx, fy, that)
      : Float64Array.from(flatIterable(points, fx, fy, that)));
};

function flatArray(points, fx, fy, that) {
  const n = points.length;
  const array = new Float64Array(n * 2);
  for (let i = 0; i < n; ++i) {
    const p = points[i];
    array[i * 2] = fx.call(that, p, i, points);
    array[i * 2 + 1] = fy.call(that, p, i, points);
  }
  return array;
}

function* flatIterable(points, fx, fy, that) {
  let i = 0;
  for (const p of points) {
    yield fx.call(that, p, i, points);
    yield fy.call(that, p, i, points);
    ++i;
  }
}

function compileSearch(funcName, predicate, reversed, extraArgs, earlyOut) {
  var code = [
    "function ", funcName, "(a,l,h,", extraArgs.join(","),  "){",
    earlyOut ? "" : "var i=", (reversed ? "l-1" : "h+1"),
    ";while(l<=h){var m=(l+h)>>>1,x=a[m]"];
  if(earlyOut) {
    if(predicate.indexOf("c") < 0) {
      code.push(";if(x===y){return m}else if(x<=y){");
    } else {
      code.push(";var p=c(x,y);if(p===0){return m}else if(p<=0){");
    }
  } else {
    code.push(";if(", predicate, "){i=m;");
  }
  if(reversed) {
    code.push("l=m+1}else{h=m-1}");
  } else {
    code.push("h=m-1}else{l=m+1}");
  }
  code.push("}");
  if(earlyOut) {
    code.push("return -1};");
  } else {
    code.push("return i};");
  }
  return code.join("")
}

function compileBoundsSearch(predicate, reversed, suffix, earlyOut) {
  var result = new Function([
  compileSearch("A", "x" + predicate + "y", reversed, ["y"], earlyOut),
  compileSearch("P", "c(x,y)" + predicate + "0", reversed, ["y", "c"], earlyOut),
"function dispatchBsearch", suffix, "(a,y,c,l,h){\
if(typeof(c)==='function'){\
return P(a,(l===void 0)?0:l|0,(h===void 0)?a.length-1:h|0,y,c)\
}else{\
return A(a,(c===void 0)?0:c|0,(l===void 0)?a.length-1:l|0,y)\
}}\
return dispatchBsearch", suffix].join(""));
  return result()
}

var searchBounds = {
  ge: compileBoundsSearch(">=", false,  "GE"),
  gt: compileBoundsSearch(">",  false,  "GT"),
  lt: compileBoundsSearch("<",  true,   "LT"),
  le: compileBoundsSearch("<=", true,   "LE"),
  eq: compileBoundsSearch("-",  true,   "EQ", true)
};

var commonjsGlobal = typeof globalThis !== 'undefined' ? globalThis : typeof window !== 'undefined' ? window : typeof global !== 'undefined' ? global : typeof self !== 'undefined' ? self : {};

function createCommonjsModule(fn, module) {
	return module = { exports: {} }, fn(module, module.exports), module.exports;
}

var twoProduct_1 = twoProduct;

var SPLITTER = +(Math.pow(2, 27) + 1.0);

function twoProduct(a, b, result) {
  var x = a * b;

  var c = SPLITTER * a;
  var abig = c - a;
  var ahi = c - abig;
  var alo = a - ahi;

  var d = SPLITTER * b;
  var bbig = d - b;
  var bhi = d - bbig;
  var blo = b - bhi;

  var err1 = x - (ahi * bhi);
  var err2 = err1 - (alo * bhi);
  var err3 = err2 - (ahi * blo);

  var y = alo * blo - err3;

  if(result) {
    result[0] = y;
    result[1] = x;
    return result
  }

  return [ y, x ]
}

var robustSum = linearExpansionSum;

//Easy case: Add two scalars
function scalarScalar(a, b) {
  var x = a + b;
  var bv = x - a;
  var av = x - bv;
  var br = b - bv;
  var ar = a - av;
  var y = ar + br;
  if(y) {
    return [y, x]
  }
  return [x]
}

function linearExpansionSum(e, f) {
  var ne = e.length|0;
  var nf = f.length|0;
  if(ne === 1 && nf === 1) {
    return scalarScalar(e[0], f[0])
  }
  var n = ne + nf;
  var g = new Array(n);
  var count = 0;
  var eptr = 0;
  var fptr = 0;
  var abs = Math.abs;
  var ei = e[eptr];
  var ea = abs(ei);
  var fi = f[fptr];
  var fa = abs(fi);
  var a, b;
  if(ea < fa) {
    b = ei;
    eptr += 1;
    if(eptr < ne) {
      ei = e[eptr];
      ea = abs(ei);
    }
  } else {
    b = fi;
    fptr += 1;
    if(fptr < nf) {
      fi = f[fptr];
      fa = abs(fi);
    }
  }
  if((eptr < ne && ea < fa) || (fptr >= nf)) {
    a = ei;
    eptr += 1;
    if(eptr < ne) {
      ei = e[eptr];
      ea = abs(ei);
    }
  } else {
    a = fi;
    fptr += 1;
    if(fptr < nf) {
      fi = f[fptr];
      fa = abs(fi);
    }
  }
  var x = a + b;
  var bv = x - a;
  var y = b - bv;
  var q0 = y;
  var q1 = x;
  var _x, _bv, _av, _br, _ar;
  while(eptr < ne && fptr < nf) {
    if(ea < fa) {
      a = ei;
      eptr += 1;
      if(eptr < ne) {
        ei = e[eptr];
        ea = abs(ei);
      }
    } else {
      a = fi;
      fptr += 1;
      if(fptr < nf) {
        fi = f[fptr];
        fa = abs(fi);
      }
    }
    b = q0;
    x = a + b;
    bv = x - a;
    y = b - bv;
    if(y) {
      g[count++] = y;
    }
    _x = q1 + x;
    _bv = _x - q1;
    _av = _x - _bv;
    _br = x - _bv;
    _ar = q1 - _av;
    q0 = _ar + _br;
    q1 = _x;
  }
  while(eptr < ne) {
    a = ei;
    b = q0;
    x = a + b;
    bv = x - a;
    y = b - bv;
    if(y) {
      g[count++] = y;
    }
    _x = q1 + x;
    _bv = _x - q1;
    _av = _x - _bv;
    _br = x - _bv;
    _ar = q1 - _av;
    q0 = _ar + _br;
    q1 = _x;
    eptr += 1;
    if(eptr < ne) {
      ei = e[eptr];
    }
  }
  while(fptr < nf) {
    a = fi;
    b = q0;
    x = a + b;
    bv = x - a;
    y = b - bv;
    if(y) {
      g[count++] = y;
    } 
    _x = q1 + x;
    _bv = _x - q1;
    _av = _x - _bv;
    _br = x - _bv;
    _ar = q1 - _av;
    q0 = _ar + _br;
    q1 = _x;
    fptr += 1;
    if(fptr < nf) {
      fi = f[fptr];
    }
  }
  if(q0) {
    g[count++] = q0;
  }
  if(q1) {
    g[count++] = q1;
  }
  if(!count) {
    g[count++] = 0.0;  
  }
  g.length = count;
  return g
}

var twoSum = fastTwoSum;

function fastTwoSum(a, b, result) {
	var x = a + b;
	var bv = x - a;
	var av = x - bv;
	var br = b - bv;
	var ar = a - av;
	if(result) {
		result[0] = ar + br;
		result[1] = x;
		return result
	}
	return [ar+br, x]
}

var robustScale = scaleLinearExpansion;

function scaleLinearExpansion(e, scale) {
  var n = e.length;
  if(n === 1) {
    var ts = twoProduct_1(e[0], scale);
    if(ts[0]) {
      return ts
    }
    return [ ts[1] ]
  }
  var g = new Array(2 * n);
  var q = [0.1, 0.1];
  var t = [0.1, 0.1];
  var count = 0;
  twoProduct_1(e[0], scale, q);
  if(q[0]) {
    g[count++] = q[0];
  }
  for(var i=1; i<n; ++i) {
    twoProduct_1(e[i], scale, t);
    var pq = q[1];
    twoSum(pq, t[0], q);
    if(q[0]) {
      g[count++] = q[0];
    }
    var a = t[1];
    var b = q[1];
    var x = a + b;
    var bv = x - a;
    var y = b - bv;
    q[1] = x;
    if(y) {
      g[count++] = y;
    }
  }
  if(q[1]) {
    g[count++] = q[1];
  }
  if(count === 0) {
    g[count++] = 0.0;
  }
  g.length = count;
  return g
}

var robustDiff = robustSubtract;

//Easy case: Add two scalars
function scalarScalar$1(a, b) {
  var x = a + b;
  var bv = x - a;
  var av = x - bv;
  var br = b - bv;
  var ar = a - av;
  var y = ar + br;
  if(y) {
    return [y, x]
  }
  return [x]
}

function robustSubtract(e, f) {
  var ne = e.length|0;
  var nf = f.length|0;
  if(ne === 1 && nf === 1) {
    return scalarScalar$1(e[0], -f[0])
  }
  var n = ne + nf;
  var g = new Array(n);
  var count = 0;
  var eptr = 0;
  var fptr = 0;
  var abs = Math.abs;
  var ei = e[eptr];
  var ea = abs(ei);
  var fi = -f[fptr];
  var fa = abs(fi);
  var a, b;
  if(ea < fa) {
    b = ei;
    eptr += 1;
    if(eptr < ne) {
      ei = e[eptr];
      ea = abs(ei);
    }
  } else {
    b = fi;
    fptr += 1;
    if(fptr < nf) {
      fi = -f[fptr];
      fa = abs(fi);
    }
  }
  if((eptr < ne && ea < fa) || (fptr >= nf)) {
    a = ei;
    eptr += 1;
    if(eptr < ne) {
      ei = e[eptr];
      ea = abs(ei);
    }
  } else {
    a = fi;
    fptr += 1;
    if(fptr < nf) {
      fi = -f[fptr];
      fa = abs(fi);
    }
  }
  var x = a + b;
  var bv = x - a;
  var y = b - bv;
  var q0 = y;
  var q1 = x;
  var _x, _bv, _av, _br, _ar;
  while(eptr < ne && fptr < nf) {
    if(ea < fa) {
      a = ei;
      eptr += 1;
      if(eptr < ne) {
        ei = e[eptr];
        ea = abs(ei);
      }
    } else {
      a = fi;
      fptr += 1;
      if(fptr < nf) {
        fi = -f[fptr];
        fa = abs(fi);
      }
    }
    b = q0;
    x = a + b;
    bv = x - a;
    y = b - bv;
    if(y) {
      g[count++] = y;
    }
    _x = q1 + x;
    _bv = _x - q1;
    _av = _x - _bv;
    _br = x - _bv;
    _ar = q1 - _av;
    q0 = _ar + _br;
    q1 = _x;
  }
  while(eptr < ne) {
    a = ei;
    b = q0;
    x = a + b;
    bv = x - a;
    y = b - bv;
    if(y) {
      g[count++] = y;
    }
    _x = q1 + x;
    _bv = _x - q1;
    _av = _x - _bv;
    _br = x - _bv;
    _ar = q1 - _av;
    q0 = _ar + _br;
    q1 = _x;
    eptr += 1;
    if(eptr < ne) {
      ei = e[eptr];
    }
  }
  while(fptr < nf) {
    a = fi;
    b = q0;
    x = a + b;
    bv = x - a;
    y = b - bv;
    if(y) {
      g[count++] = y;
    } 
    _x = q1 + x;
    _bv = _x - q1;
    _av = _x - _bv;
    _br = x - _bv;
    _ar = q1 - _av;
    q0 = _ar + _br;
    q1 = _x;
    fptr += 1;
    if(fptr < nf) {
      fi = -f[fptr];
    }
  }
  if(q0) {
    g[count++] = q0;
  }
  if(q1) {
    g[count++] = q1;
  }
  if(!count) {
    g[count++] = 0.0;  
  }
  g.length = count;
  return g
}

var orientation_1 = createCommonjsModule(function (module) {






var NUM_EXPAND = 5;

var EPSILON     = 1.1102230246251565e-16;
var ERRBOUND3   = (3.0 + 16.0 * EPSILON) * EPSILON;
var ERRBOUND4   = (7.0 + 56.0 * EPSILON) * EPSILON;

function cofactor(m, c) {
  var result = new Array(m.length-1);
  for(var i=1; i<m.length; ++i) {
    var r = result[i-1] = new Array(m.length-1);
    for(var j=0,k=0; j<m.length; ++j) {
      if(j === c) {
        continue
      }
      r[k++] = m[i][j];
    }
  }
  return result
}

function matrix(n) {
  var result = new Array(n);
  for(var i=0; i<n; ++i) {
    result[i] = new Array(n);
    for(var j=0; j<n; ++j) {
      result[i][j] = ["m", j, "[", (n-i-1), "]"].join("");
    }
  }
  return result
}

function sign(n) {
  if(n & 1) {
    return "-"
  }
  return ""
}

function generateSum(expr) {
  if(expr.length === 1) {
    return expr[0]
  } else if(expr.length === 2) {
    return ["sum(", expr[0], ",", expr[1], ")"].join("")
  } else {
    var m = expr.length>>1;
    return ["sum(", generateSum(expr.slice(0, m)), ",", generateSum(expr.slice(m)), ")"].join("")
  }
}

function determinant(m) {
  if(m.length === 2) {
    return [["sum(prod(", m[0][0], ",", m[1][1], "),prod(-", m[0][1], ",", m[1][0], "))"].join("")]
  } else {
    var expr = [];
    for(var i=0; i<m.length; ++i) {
      expr.push(["scale(", generateSum(determinant(cofactor(m, i))), ",", sign(i), m[0][i], ")"].join(""));
    }
    return expr
  }
}

function orientation(n) {
  var pos = [];
  var neg = [];
  var m = matrix(n);
  var args = [];
  for(var i=0; i<n; ++i) {
    if((i&1)===0) {
      pos.push.apply(pos, determinant(cofactor(m, i)));
    } else {
      neg.push.apply(neg, determinant(cofactor(m, i)));
    }
    args.push("m" + i);
  }
  var posExpr = generateSum(pos);
  var negExpr = generateSum(neg);
  var funcName = "orientation" + n + "Exact";
  var code = ["function ", funcName, "(", args.join(), "){var p=", posExpr, ",n=", negExpr, ",d=sub(p,n);\
return d[d.length-1];};return ", funcName].join("");
  var proc = new Function("sum", "prod", "scale", "sub", code);
  return proc(robustSum, twoProduct_1, robustScale, robustDiff)
}

var orientation3Exact = orientation(3);
var orientation4Exact = orientation(4);

var CACHED = [
  function orientation0() { return 0 },
  function orientation1() { return 0 },
  function orientation2(a, b) { 
    return b[0] - a[0]
  },
  function orientation3(a, b, c) {
    var l = (a[1] - c[1]) * (b[0] - c[0]);
    var r = (a[0] - c[0]) * (b[1] - c[1]);
    var det = l - r;
    var s;
    if(l > 0) {
      if(r <= 0) {
        return det
      } else {
        s = l + r;
      }
    } else if(l < 0) {
      if(r >= 0) {
        return det
      } else {
        s = -(l + r);
      }
    } else {
      return det
    }
    var tol = ERRBOUND3 * s;
    if(det >= tol || det <= -tol) {
      return det
    }
    return orientation3Exact(a, b, c)
  },
  function orientation4(a,b,c,d) {
    var adx = a[0] - d[0];
    var bdx = b[0] - d[0];
    var cdx = c[0] - d[0];
    var ady = a[1] - d[1];
    var bdy = b[1] - d[1];
    var cdy = c[1] - d[1];
    var adz = a[2] - d[2];
    var bdz = b[2] - d[2];
    var cdz = c[2] - d[2];
    var bdxcdy = bdx * cdy;
    var cdxbdy = cdx * bdy;
    var cdxady = cdx * ady;
    var adxcdy = adx * cdy;
    var adxbdy = adx * bdy;
    var bdxady = bdx * ady;
    var det = adz * (bdxcdy - cdxbdy) 
            + bdz * (cdxady - adxcdy)
            + cdz * (adxbdy - bdxady);
    var permanent = (Math.abs(bdxcdy) + Math.abs(cdxbdy)) * Math.abs(adz)
                  + (Math.abs(cdxady) + Math.abs(adxcdy)) * Math.abs(bdz)
                  + (Math.abs(adxbdy) + Math.abs(bdxady)) * Math.abs(cdz);
    var tol = ERRBOUND4 * permanent;
    if ((det > tol) || (-det > tol)) {
      return det
    }
    return orientation4Exact(a,b,c,d)
  }
];

function slowOrient(args) {
  var proc = CACHED[args.length];
  if(!proc) {
    proc = CACHED[args.length] = orientation(args.length);
  }
  return proc.apply(undefined, args)
}

function generateOrientationProc() {
  while(CACHED.length <= NUM_EXPAND) {
    CACHED.push(orientation(CACHED.length));
  }
  var args = [];
  var procArgs = ["slow"];
  for(var i=0; i<=NUM_EXPAND; ++i) {
    args.push("a" + i);
    procArgs.push("o" + i);
  }
  var code = [
    "function getOrientation(", args.join(), "){switch(arguments.length){case 0:case 1:return 0;"
  ];
  for(var i=2; i<=NUM_EXPAND; ++i) {
    code.push("case ", i, ":return o", i, "(", args.slice(0, i).join(), ");");
  }
  code.push("}var s=new Array(arguments.length);for(var i=0;i<arguments.length;++i){s[i]=arguments[i]};return slow(s);}return getOrientation");
  procArgs.push(code.join(""));

  var proc = Function.apply(undefined, procArgs);
  module.exports = proc.apply(undefined, [slowOrient].concat(CACHED));
  for(var i=0; i<=NUM_EXPAND; ++i) {
    module.exports[i] = CACHED[i];
  }
}

generateOrientationProc();
});

var orient$1 = orientation_1[3];

var EVENT_POINT = 0;
var EVENT_END   = 1;
var EVENT_START = 2;

var monotone = monotoneTriangulate;

//A partial convex hull fragment, made of two unimonotone polygons
function PartialHull(a, b, idx, lowerIds, upperIds) {
  this.a = a;
  this.b = b;
  this.idx = idx;
  this.lowerIds = lowerIds;
  this.upperIds = upperIds;
}

//An event in the sweep line procedure
function Event(a, b, type, idx) {
  this.a    = a;
  this.b    = b;
  this.type = type;
  this.idx  = idx;
}

//This is used to compare events for the sweep line procedure
// Points are:
//  1. sorted lexicographically
//  2. sorted by type  (point < end < start)
//  3. segments sorted by winding order
//  4. sorted by index
function compareEvent(a, b) {
  var d =
    (a.a[0] - b.a[0]) ||
    (a.a[1] - b.a[1]) ||
    (a.type - b.type);
  if(d) { return d }
  if(a.type !== EVENT_POINT) {
    d = orient$1(a.a, a.b, b.b);
    if(d) { return d }
  }
  return a.idx - b.idx
}

function testPoint(hull, p) {
  return orient$1(hull.a, hull.b, p)
}

function addPoint(cells, hulls, points, p, idx) {
  var lo = searchBounds.lt(hulls, p, testPoint);
  var hi = searchBounds.gt(hulls, p, testPoint);
  for(var i=lo; i<hi; ++i) {
    var hull = hulls[i];

    //Insert p into lower hull
    var lowerIds = hull.lowerIds;
    var m = lowerIds.length;
    while(m > 1 && orient$1(
        points[lowerIds[m-2]],
        points[lowerIds[m-1]],
        p) > 0) {
      cells.push(
        [lowerIds[m-1],
         lowerIds[m-2],
         idx]);
      m -= 1;
    }
    lowerIds.length = m;
    lowerIds.push(idx);

    //Insert p into upper hull
    var upperIds = hull.upperIds;
    var m = upperIds.length;
    while(m > 1 && orient$1(
        points[upperIds[m-2]],
        points[upperIds[m-1]],
        p) < 0) {
      cells.push(
        [upperIds[m-2],
         upperIds[m-1],
         idx]);
      m -= 1;
    }
    upperIds.length = m;
    upperIds.push(idx);
  }
}

function findSplit(hull, edge) {
  var d;
  if(hull.a[0] < edge.a[0]) {
    d = orient$1(hull.a, hull.b, edge.a);
  } else {
    d = orient$1(edge.b, edge.a, hull.a);
  }
  if(d) { return d }
  if(edge.b[0] < hull.b[0]) {
    d = orient$1(hull.a, hull.b, edge.b);
  } else {
    d = orient$1(edge.b, edge.a, hull.b);
  }
  return d || hull.idx - edge.idx
}

function splitHulls(hulls, points, event) {
  var splitIdx = searchBounds.le(hulls, event, findSplit);
  var hull = hulls[splitIdx];
  var upperIds = hull.upperIds;
  var x = upperIds[upperIds.length-1];
  hull.upperIds = [x];
  hulls.splice(splitIdx+1, 0,
    new PartialHull(event.a, event.b, event.idx, [x], upperIds));
}


function mergeHulls(hulls, points, event) {
  //Swap pointers for merge search
  var tmp = event.a;
  event.a = event.b;
  event.b = tmp;
  var mergeIdx = searchBounds.eq(hulls, event, findSplit);
  var upper = hulls[mergeIdx];
  var lower = hulls[mergeIdx-1];
  lower.upperIds = upper.upperIds;
  hulls.splice(mergeIdx, 1);
}


function monotoneTriangulate(points, edges) {

  var numPoints = points.length;
  var numEdges = edges.length;

  var events = [];

  //Create point events
  for(var i=0; i<numPoints; ++i) {
    events.push(new Event(
      points[i],
      null,
      EVENT_POINT,
      i));
  }

  //Create edge events
  for(var i=0; i<numEdges; ++i) {
    var e = edges[i];
    var a = points[e[0]];
    var b = points[e[1]];
    if(a[0] < b[0]) {
      events.push(
        new Event(a, b, EVENT_START, i),
        new Event(b, a, EVENT_END, i));
    } else if(a[0] > b[0]) {
      events.push(
        new Event(b, a, EVENT_START, i),
        new Event(a, b, EVENT_END, i));
    }
  }

  //Sort events
  events.sort(compareEvent);

  //Initialize hull
  var minX = events[0].a[0] - (1 + Math.abs(events[0].a[0])) * Math.pow(2, -52);
  var hull = [ new PartialHull([minX, 1], [minX, 0], -1, [], [], [], []) ];

  //Process events in order
  var cells = [];
  for(var i=0, numEvents=events.length; i<numEvents; ++i) {
    var event = events[i];
    var type = event.type;
    if(type === EVENT_POINT) {
      addPoint(cells, hull, points, event.a, event.idx);
    } else if(type === EVENT_START) {
      splitHulls(hull, points, event);
    } else {
      mergeHulls(hull, points, event);
    }
  }

  //Return triangulation
  return cells
}

var triangulation = createTriangulation;

function Triangulation(stars, edges) {
  this.stars = stars;
  this.edges = edges;
}

var proto = Triangulation.prototype;

function removePair(list, j, k) {
  for(var i=1, n=list.length; i<n; i+=2) {
    if(list[i-1] === j && list[i] === k) {
      list[i-1] = list[n-2];
      list[i] = list[n-1];
      list.length = n - 2;
      return
    }
  }
}

proto.isConstraint = (function() {
  var e = [0,0];
  function compareLex(a, b) {
    return a[0] - b[0] || a[1] - b[1]
  }
  return function(i, j) {
    e[0] = Math.min(i,j);
    e[1] = Math.max(i,j);
    return searchBounds.eq(this.edges, e, compareLex) >= 0
  }
})();

proto.removeTriangle = function(i, j, k) {
  var stars = this.stars;
  removePair(stars[i], j, k);
  removePair(stars[j], k, i);
  removePair(stars[k], i, j);
};

proto.addTriangle = function(i, j, k) {
  var stars = this.stars;
  stars[i].push(j, k);
  stars[j].push(k, i);
  stars[k].push(i, j);
};

proto.opposite = function(j, i) {
  var list = this.stars[i];
  for(var k=1, n=list.length; k<n; k+=2) {
    if(list[k] === j) {
      return list[k-1]
    }
  }
  return -1
};

proto.flip = function(i, j) {
  var a = this.opposite(i, j);
  var b = this.opposite(j, i);
  this.removeTriangle(i, j, a);
  this.removeTriangle(j, i, b);
  this.addTriangle(i, b, a);
  this.addTriangle(j, a, b);
};

proto.edges = function() {
  var stars = this.stars;
  var result = [];
  for(var i=0, n=stars.length; i<n; ++i) {
    var list = stars[i];
    for(var j=0, m=list.length; j<m; j+=2) {
      result.push([list[j], list[j+1]]);
    }
  }
  return result
};

proto.cells = function() {
  var stars = this.stars;
  var result = [];
  for(var i=0, n=stars.length; i<n; ++i) {
    var list = stars[i];
    for(var j=0, m=list.length; j<m; j+=2) {
      var s = list[j];
      var t = list[j+1];
      if(i < Math.min(s, t)) {
        result.push([i, s, t]);
      }
    }
  }
  return result
};

function createTriangulation(numVerts, edges) {
  var stars = new Array(numVerts);
  for(var i=0; i<numVerts; ++i) {
    stars[i] = [];
  }
  return new Triangulation(stars, edges)
}

var inSphere = createCommonjsModule(function (module) {






var NUM_EXPAND = 6;

function cofactor(m, c) {
  var result = new Array(m.length-1);
  for(var i=1; i<m.length; ++i) {
    var r = result[i-1] = new Array(m.length-1);
    for(var j=0,k=0; j<m.length; ++j) {
      if(j === c) {
        continue
      }
      r[k++] = m[i][j];
    }
  }
  return result
}

function matrix(n) {
  var result = new Array(n);
  for(var i=0; i<n; ++i) {
    result[i] = new Array(n);
    for(var j=0; j<n; ++j) {
      result[i][j] = ["m", j, "[", (n-i-2), "]"].join("");
    }
  }
  return result
}

function generateSum(expr) {
  if(expr.length === 1) {
    return expr[0]
  } else if(expr.length === 2) {
    return ["sum(", expr[0], ",", expr[1], ")"].join("")
  } else {
    var m = expr.length>>1;
    return ["sum(", generateSum(expr.slice(0, m)), ",", generateSum(expr.slice(m)), ")"].join("")
  }
}

function makeProduct(a, b) {
  if(a.charAt(0) === "m") {
    if(b.charAt(0) === "w") {
      var toks = a.split("[");
      return ["w", b.substr(1), "m", toks[0].substr(1)].join("")
    } else {
      return ["prod(", a, ",", b, ")"].join("")
    }
  } else {
    return makeProduct(b, a)
  }
}

function sign(s) {
  if(s & 1 !== 0) {
    return "-"
  }
  return ""
}

function determinant(m) {
  if(m.length === 2) {
    return [["diff(", makeProduct(m[0][0], m[1][1]), ",", makeProduct(m[1][0], m[0][1]), ")"].join("")]
  } else {
    var expr = [];
    for(var i=0; i<m.length; ++i) {
      expr.push(["scale(", generateSum(determinant(cofactor(m, i))), ",", sign(i), m[0][i], ")"].join(""));
    }
    return expr
  }
}

function makeSquare(d, n) {
  var terms = [];
  for(var i=0; i<n-2; ++i) {
    terms.push(["prod(m", d, "[", i, "],m", d, "[", i, "])"].join(""));
  }
  return generateSum(terms)
}

function orientation(n) {
  var pos = [];
  var neg = [];
  var m = matrix(n);
  for(var i=0; i<n; ++i) {
    m[0][i] = "1";
    m[n-1][i] = "w"+i;
  } 
  for(var i=0; i<n; ++i) {
    if((i&1)===0) {
      pos.push.apply(pos,determinant(cofactor(m, i)));
    } else {
      neg.push.apply(neg,determinant(cofactor(m, i)));
    }
  }
  var posExpr = generateSum(pos);
  var negExpr = generateSum(neg);
  var funcName = "exactInSphere" + n;
  var funcArgs = [];
  for(var i=0; i<n; ++i) {
    funcArgs.push("m" + i);
  }
  var code = ["function ", funcName, "(", funcArgs.join(), "){"];
  for(var i=0; i<n; ++i) {
    code.push("var w",i,"=",makeSquare(i,n),";");
    for(var j=0; j<n; ++j) {
      if(j !== i) {
        code.push("var w",i,"m",j,"=scale(w",i,",m",j,"[0]);");
      }
    }
  }
  code.push("var p=", posExpr, ",n=", negExpr, ",d=diff(p,n);return d[d.length-1];}return ", funcName);
  var proc = new Function("sum", "diff", "prod", "scale", code.join(""));
  return proc(robustSum, robustDiff, twoProduct_1, robustScale)
}

function inSphere0() { return 0 }
function inSphere1() { return 0 }
function inSphere2() { return 0 }

var CACHED = [
  inSphere0,
  inSphere1,
  inSphere2
];

function slowInSphere(args) {
  var proc = CACHED[args.length];
  if(!proc) {
    proc = CACHED[args.length] = orientation(args.length);
  }
  return proc.apply(undefined, args)
}

function generateInSphereTest() {
  while(CACHED.length <= NUM_EXPAND) {
    CACHED.push(orientation(CACHED.length));
  }
  var args = [];
  var procArgs = ["slow"];
  for(var i=0; i<=NUM_EXPAND; ++i) {
    args.push("a" + i);
    procArgs.push("o" + i);
  }
  var code = [
    "function testInSphere(", args.join(), "){switch(arguments.length){case 0:case 1:return 0;"
  ];
  for(var i=2; i<=NUM_EXPAND; ++i) {
    code.push("case ", i, ":return o", i, "(", args.slice(0, i).join(), ");");
  }
  code.push("}var s=new Array(arguments.length);for(var i=0;i<arguments.length;++i){s[i]=arguments[i]};return slow(s);}return testInSphere");
  procArgs.push(code.join(""));

  var proc = Function.apply(undefined, procArgs);

  module.exports = proc.apply(undefined, [slowInSphere].concat(CACHED));
  for(var i=0; i<=NUM_EXPAND; ++i) {
    module.exports[i] = CACHED[i];
  }
}

generateInSphereTest();
});

var inCircle$1 = inSphere[4];


var delaunay = delaunayRefine;

function testFlip(points, triangulation, stack, a, b, x) {
  var y = triangulation.opposite(a, b);

  //Test boundary edge
  if(y < 0) {
    return
  }

  //Swap edge if order flipped
  if(b < a) {
    var tmp = a;
    a = b;
    b = tmp;
    tmp = x;
    x = y;
    y = tmp;
  }

  //Test if edge is constrained
  if(triangulation.isConstraint(a, b)) {
    return
  }

  //Test if edge is delaunay
  if(inCircle$1(points[a], points[b], points[x], points[y]) < 0) {
    stack.push(a, b);
  }
}

//Assume edges are sorted lexicographically
function delaunayRefine(points, triangulation) {
  var stack = [];

  var numPoints = points.length;
  var stars = triangulation.stars;
  for(var a=0; a<numPoints; ++a) {
    var star = stars[a];
    for(var j=1; j<star.length; j+=2) {
      var b = star[j];

      //If order is not consistent, then skip edge
      if(b < a) {
        continue
      }

      //Check if edge is constrained
      if(triangulation.isConstraint(a, b)) {
        continue
      }

      //Find opposite edge
      var x = star[j-1], y = -1;
      for(var k=1; k<star.length; k+=2) {
        if(star[k-1] === b) {
          y = star[k];
          break
        }
      }

      //If this is a boundary edge, don't flip it
      if(y < 0) {
        continue
      }

      //If edge is in circle, flip it
      if(inCircle$1(points[a], points[b], points[x], points[y]) < 0) {
        stack.push(a, b);
      }
    }
  }

  while(stack.length > 0) {
    var b = stack.pop();
    var a = stack.pop();

    //Find opposite pairs
    var x = -1, y = -1;
    var star = stars[a];
    for(var i=1; i<star.length; i+=2) {
      var s = star[i-1];
      var t = star[i];
      if(s === b) {
        y = t;
      } else if(t === b) {
        x = s;
      }
    }

    //If x/y are both valid then skip edge
    if(x < 0 || y < 0) {
      continue
    }

    //If edge is now delaunay, then don't flip it
    if(inCircle$1(points[a], points[b], points[x], points[y]) >= 0) {
      continue
    }

    //Flip the edge
    triangulation.flip(a, b);

    //Test flipping neighboring edges
    testFlip(points, triangulation, stack, x, a, y);
    testFlip(points, triangulation, stack, a, y, x);
    testFlip(points, triangulation, stack, y, b, x);
    testFlip(points, triangulation, stack, b, x, y);
  }
}

var filter = classifyFaces;

function FaceIndex(cells, neighbor, constraint, flags, active, next, boundary) {
  this.cells       = cells;
  this.neighbor    = neighbor;
  this.flags       = flags;
  this.constraint  = constraint;
  this.active      = active;
  this.next        = next;
  this.boundary    = boundary;
}

var proto$1 = FaceIndex.prototype;

function compareCell(a, b) {
  return a[0] - b[0] ||
         a[1] - b[1] ||
         a[2] - b[2]
}

proto$1.locate = (function() {
  var key = [0,0,0];
  return function(a, b, c) {
    var x = a, y = b, z = c;
    if(b < c) {
      if(b < a) {
        x = b;
        y = c;
        z = a;
      }
    } else if(c < a) {
      x = c;
      y = a;
      z = b;
    }
    if(x < 0) {
      return -1
    }
    key[0] = x;
    key[1] = y;
    key[2] = z;
    return searchBounds.eq(this.cells, key, compareCell)
  }
})();

function indexCells(triangulation, infinity) {
  //First get cells and canonicalize
  var cells = triangulation.cells();
  var nc = cells.length;
  for(var i=0; i<nc; ++i) {
    var c = cells[i];
    var x = c[0], y = c[1], z = c[2];
    if(y < z) {
      if(y < x) {
        c[0] = y;
        c[1] = z;
        c[2] = x;
      }
    } else if(z < x) {
      c[0] = z;
      c[1] = x;
      c[2] = y;
    }
  }
  cells.sort(compareCell);

  //Initialize flag array
  var flags = new Array(nc);
  for(var i=0; i<flags.length; ++i) {
    flags[i] = 0;
  }

  //Build neighbor index, initialize queues
  var active = [];
  var next   = [];
  var neighbor = new Array(3*nc);
  var constraint = new Array(3*nc);
  var boundary = null;
  if(infinity) {
    boundary = [];
  }
  var index = new FaceIndex(
    cells,
    neighbor,
    constraint,
    flags,
    active,
    next,
    boundary);
  for(var i=0; i<nc; ++i) {
    var c = cells[i];
    for(var j=0; j<3; ++j) {
      var x = c[j], y = c[(j+1)%3];
      var a = neighbor[3*i+j] = index.locate(y, x, triangulation.opposite(y, x));
      var b = constraint[3*i+j] = triangulation.isConstraint(x, y);
      if(a < 0) {
        if(b) {
          next.push(i);
        } else {
          active.push(i);
          flags[i] = 1;
        }
        if(infinity) {
          boundary.push([y, x, -1]);
        }
      }
    }
  }
  return index
}

function filterCells(cells, flags, target) {
  var ptr = 0;
  for(var i=0; i<cells.length; ++i) {
    if(flags[i] === target) {
      cells[ptr++] = cells[i];
    }
  }
  cells.length = ptr;
  return cells
}

function classifyFaces(triangulation, target, infinity) {
  var index = indexCells(triangulation, infinity);

  if(target === 0) {
    if(infinity) {
      return index.cells.concat(index.boundary)
    } else {
      return index.cells
    }
  }

  var side = 1;
  var active = index.active;
  var next = index.next;
  var flags = index.flags;
  var cells = index.cells;
  var constraint = index.constraint;
  var neighbor = index.neighbor;

  while(active.length > 0 || next.length > 0) {
    while(active.length > 0) {
      var t = active.pop();
      if(flags[t] === -side) {
        continue
      }
      flags[t] = side;
      var c = cells[t];
      for(var j=0; j<3; ++j) {
        var f = neighbor[3*t+j];
        if(f >= 0 && flags[f] === 0) {
          if(constraint[3*t+j]) {
            next.push(f);
          } else {
            active.push(f);
            flags[f] = side;
          }
        }
      }
    }

    //Swap arrays and loop
    var tmp = next;
    next = active;
    active = tmp;
    next.length = 0;
    side = -side;
  }

  var result = filterCells(cells, flags, target);
  if(infinity) {
    return result.concat(index.boundary)
  }
  return result
}

var cdt2d_1 = cdt2d;

function canonicalizeEdge(e) {
  return [Math.min(e[0], e[1]), Math.max(e[0], e[1])]
}

function compareEdge(a, b) {
  return a[0]-b[0] || a[1]-b[1]
}

function canonicalizeEdges(edges) {
  return edges.map(canonicalizeEdge).sort(compareEdge)
}

function getDefault(options, property, dflt) {
  if(property in options) {
    return options[property]
  }
  return dflt
}

function cdt2d(points, edges, options) {

  if(!Array.isArray(edges)) {
    options = edges || {};
    edges = [];
  } else {
    options = options || {};
    edges = edges || [];
  }

  //Parse out options
  var delaunay$1 = !!getDefault(options, 'delaunay', true);
  var interior = !!getDefault(options, 'interior', true);
  var exterior = !!getDefault(options, 'exterior', true);
  var infinity = !!getDefault(options, 'infinity', false);

  //Handle trivial case
  if((!interior && !exterior) || points.length === 0) {
    return []
  }

  //Construct initial triangulation
  var cells = monotone(points, edges);

  //If delaunay refinement needed, then improve quality by edge flipping
  if(delaunay$1 || interior !== exterior || infinity) {

    //Index all of the cells to support fast neighborhood queries
    var triangulation$1 = triangulation(points.length, canonicalizeEdges(edges));
    for(var i=0; i<cells.length; ++i) {
      var f = cells[i];
      triangulation$1.addTriangle(f[0], f[1], f[2]);
    }

    //Run edge flipping
    if(delaunay$1) {
      delaunay(points, triangulation$1);
    }

    //Filter points
    if(!exterior) {
      return filter(triangulation$1, -1)
    } else if(!interior) {
      return filter(triangulation$1,  1, infinity)
    } else if(infinity) {
      return filter(triangulation$1, 0, infinity)
    } else {
      return triangulation$1.cells()
    }
    
  } else {
    return cells
  }
}

var unionFind = UnionFind;

function UnionFind(count) {
  this.roots = new Array(count);
  this.ranks = new Array(count);
  
  for(var i=0; i<count; ++i) {
    this.roots[i] = i;
    this.ranks[i] = 0;
  }
}

var proto$2 = UnionFind.prototype;

Object.defineProperty(proto$2, "length", {
  "get": function() {
    return this.roots.length
  }
});

proto$2.makeSet = function() {
  var n = this.roots.length;
  this.roots.push(n);
  this.ranks.push(0);
  return n;
};

proto$2.find = function(x) {
  var x0 = x;
  var roots = this.roots;
  while(roots[x] !== x) {
    x = roots[x];
  }
  while(roots[x0] !== x) {
    var y = roots[x0];
    roots[x0] = x;
    x0 = y;
  }
  return x;
};

proto$2.link = function(x, y) {
  var xr = this.find(x)
    , yr = this.find(y);
  if(xr === yr) {
    return;
  }
  var ranks = this.ranks
    , roots = this.roots
    , xd    = ranks[xr]
    , yd    = ranks[yr];
  if(xd < yd) {
    roots[xr] = yr;
  } else if(yd < xd) {
    roots[yr] = xr;
  } else {
    roots[yr] = xr;
    ++ranks[xr];
  }
};

var global$1 = (typeof global !== "undefined" ? global :
            typeof self !== "undefined" ? self :
            typeof window !== "undefined" ? window : {});

var lookup = [];
var revLookup = [];
var Arr = typeof Uint8Array !== 'undefined' ? Uint8Array : Array;
var inited = false;
function init () {
  inited = true;
  var code = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
  for (var i = 0, len = code.length; i < len; ++i) {
    lookup[i] = code[i];
    revLookup[code.charCodeAt(i)] = i;
  }

  revLookup['-'.charCodeAt(0)] = 62;
  revLookup['_'.charCodeAt(0)] = 63;
}

function toByteArray (b64) {
  if (!inited) {
    init();
  }
  var i, j, l, tmp, placeHolders, arr;
  var len = b64.length;

  if (len % 4 > 0) {
    throw new Error('Invalid string. Length must be a multiple of 4')
  }

  // the number of equal signs (place holders)
  // if there are two placeholders, than the two characters before it
  // represent one byte
  // if there is only one, then the three characters before it represent 2 bytes
  // this is just a cheap hack to not do indexOf twice
  placeHolders = b64[len - 2] === '=' ? 2 : b64[len - 1] === '=' ? 1 : 0;

  // base64 is 4/3 + up to two characters of the original data
  arr = new Arr(len * 3 / 4 - placeHolders);

  // if there are placeholders, only get up to the last complete 4 chars
  l = placeHolders > 0 ? len - 4 : len;

  var L = 0;

  for (i = 0, j = 0; i < l; i += 4, j += 3) {
    tmp = (revLookup[b64.charCodeAt(i)] << 18) | (revLookup[b64.charCodeAt(i + 1)] << 12) | (revLookup[b64.charCodeAt(i + 2)] << 6) | revLookup[b64.charCodeAt(i + 3)];
    arr[L++] = (tmp >> 16) & 0xFF;
    arr[L++] = (tmp >> 8) & 0xFF;
    arr[L++] = tmp & 0xFF;
  }

  if (placeHolders === 2) {
    tmp = (revLookup[b64.charCodeAt(i)] << 2) | (revLookup[b64.charCodeAt(i + 1)] >> 4);
    arr[L++] = tmp & 0xFF;
  } else if (placeHolders === 1) {
    tmp = (revLookup[b64.charCodeAt(i)] << 10) | (revLookup[b64.charCodeAt(i + 1)] << 4) | (revLookup[b64.charCodeAt(i + 2)] >> 2);
    arr[L++] = (tmp >> 8) & 0xFF;
    arr[L++] = tmp & 0xFF;
  }

  return arr
}

function tripletToBase64 (num) {
  return lookup[num >> 18 & 0x3F] + lookup[num >> 12 & 0x3F] + lookup[num >> 6 & 0x3F] + lookup[num & 0x3F]
}

function encodeChunk (uint8, start, end) {
  var tmp;
  var output = [];
  for (var i = start; i < end; i += 3) {
    tmp = (uint8[i] << 16) + (uint8[i + 1] << 8) + (uint8[i + 2]);
    output.push(tripletToBase64(tmp));
  }
  return output.join('')
}

function fromByteArray (uint8) {
  if (!inited) {
    init();
  }
  var tmp;
  var len = uint8.length;
  var extraBytes = len % 3; // if we have 1 byte left, pad 2 bytes
  var output = '';
  var parts = [];
  var maxChunkLength = 16383; // must be multiple of 3

  // go through the array every three bytes, we'll deal with trailing stuff later
  for (var i = 0, len2 = len - extraBytes; i < len2; i += maxChunkLength) {
    parts.push(encodeChunk(uint8, i, (i + maxChunkLength) > len2 ? len2 : (i + maxChunkLength)));
  }

  // pad the end with zeros, but make sure to not forget the extra bytes
  if (extraBytes === 1) {
    tmp = uint8[len - 1];
    output += lookup[tmp >> 2];
    output += lookup[(tmp << 4) & 0x3F];
    output += '==';
  } else if (extraBytes === 2) {
    tmp = (uint8[len - 2] << 8) + (uint8[len - 1]);
    output += lookup[tmp >> 10];
    output += lookup[(tmp >> 4) & 0x3F];
    output += lookup[(tmp << 2) & 0x3F];
    output += '=';
  }

  parts.push(output);

  return parts.join('')
}

var base64 = /*#__PURE__*/Object.freeze({
	toByteArray: toByteArray,
	fromByteArray: fromByteArray
});

function read (buffer, offset, isLE, mLen, nBytes) {
  var e, m;
  var eLen = nBytes * 8 - mLen - 1;
  var eMax = (1 << eLen) - 1;
  var eBias = eMax >> 1;
  var nBits = -7;
  var i = isLE ? (nBytes - 1) : 0;
  var d = isLE ? -1 : 1;
  var s = buffer[offset + i];

  i += d;

  e = s & ((1 << (-nBits)) - 1);
  s >>= (-nBits);
  nBits += eLen;
  for (; nBits > 0; e = e * 256 + buffer[offset + i], i += d, nBits -= 8) {}

  m = e & ((1 << (-nBits)) - 1);
  e >>= (-nBits);
  nBits += mLen;
  for (; nBits > 0; m = m * 256 + buffer[offset + i], i += d, nBits -= 8) {}

  if (e === 0) {
    e = 1 - eBias;
  } else if (e === eMax) {
    return m ? NaN : ((s ? -1 : 1) * Infinity)
  } else {
    m = m + Math.pow(2, mLen);
    e = e - eBias;
  }
  return (s ? -1 : 1) * m * Math.pow(2, e - mLen)
}

function write (buffer, value, offset, isLE, mLen, nBytes) {
  var e, m, c;
  var eLen = nBytes * 8 - mLen - 1;
  var eMax = (1 << eLen) - 1;
  var eBias = eMax >> 1;
  var rt = (mLen === 23 ? Math.pow(2, -24) - Math.pow(2, -77) : 0);
  var i = isLE ? 0 : (nBytes - 1);
  var d = isLE ? 1 : -1;
  var s = value < 0 || (value === 0 && 1 / value < 0) ? 1 : 0;

  value = Math.abs(value);

  if (isNaN(value) || value === Infinity) {
    m = isNaN(value) ? 1 : 0;
    e = eMax;
  } else {
    e = Math.floor(Math.log(value) / Math.LN2);
    if (value * (c = Math.pow(2, -e)) < 1) {
      e--;
      c *= 2;
    }
    if (e + eBias >= 1) {
      value += rt / c;
    } else {
      value += rt * Math.pow(2, 1 - eBias);
    }
    if (value * c >= 2) {
      e++;
      c /= 2;
    }

    if (e + eBias >= eMax) {
      m = 0;
      e = eMax;
    } else if (e + eBias >= 1) {
      m = (value * c - 1) * Math.pow(2, mLen);
      e = e + eBias;
    } else {
      m = value * Math.pow(2, eBias - 1) * Math.pow(2, mLen);
      e = 0;
    }
  }

  for (; mLen >= 8; buffer[offset + i] = m & 0xff, i += d, m /= 256, mLen -= 8) {}

  e = (e << mLen) | m;
  eLen += mLen;
  for (; eLen > 0; buffer[offset + i] = e & 0xff, i += d, e /= 256, eLen -= 8) {}

  buffer[offset + i - d] |= s * 128;
}

var toString = {}.toString;

var isArray = Array.isArray || function (arr) {
  return toString.call(arr) == '[object Array]';
};

var INSPECT_MAX_BYTES = 50;

/**
 * If `Buffer.TYPED_ARRAY_SUPPORT`:
 *   === true    Use Uint8Array implementation (fastest)
 *   === false   Use Object implementation (most compatible, even IE6)
 *
 * Browsers that support typed arrays are IE 10+, Firefox 4+, Chrome 7+, Safari 5.1+,
 * Opera 11.6+, iOS 4.2+.
 *
 * Due to various browser bugs, sometimes the Object implementation will be used even
 * when the browser supports typed arrays.
 *
 * Note:
 *
 *   - Firefox 4-29 lacks support for adding new properties to `Uint8Array` instances,
 *     See: https://bugzilla.mozilla.org/show_bug.cgi?id=695438.
 *
 *   - Chrome 9-10 is missing the `TypedArray.prototype.subarray` function.
 *
 *   - IE10 has a broken `TypedArray.prototype.subarray` function which returns arrays of
 *     incorrect length in some situations.

 * We detect these buggy browsers and set `Buffer.TYPED_ARRAY_SUPPORT` to `false` so they
 * get the Object implementation, which is slower but behaves correctly.
 */
Buffer.TYPED_ARRAY_SUPPORT = global$1.TYPED_ARRAY_SUPPORT !== undefined
  ? global$1.TYPED_ARRAY_SUPPORT
  : true;

/*
 * Export kMaxLength after typed array support is determined.
 */
var _kMaxLength = kMaxLength();

function kMaxLength () {
  return Buffer.TYPED_ARRAY_SUPPORT
    ? 0x7fffffff
    : 0x3fffffff
}

function createBuffer (that, length) {
  if (kMaxLength() < length) {
    throw new RangeError('Invalid typed array length')
  }
  if (Buffer.TYPED_ARRAY_SUPPORT) {
    // Return an augmented `Uint8Array` instance, for best performance
    that = new Uint8Array(length);
    that.__proto__ = Buffer.prototype;
  } else {
    // Fallback: Return an object instance of the Buffer class
    if (that === null) {
      that = new Buffer(length);
    }
    that.length = length;
  }

  return that
}

/**
 * The Buffer constructor returns instances of `Uint8Array` that have their
 * prototype changed to `Buffer.prototype`. Furthermore, `Buffer` is a subclass of
 * `Uint8Array`, so the returned instances will have all the node `Buffer` methods
 * and the `Uint8Array` methods. Square bracket notation works as expected -- it
 * returns a single octet.
 *
 * The `Uint8Array` prototype remains unmodified.
 */

function Buffer (arg, encodingOrOffset, length) {
  if (!Buffer.TYPED_ARRAY_SUPPORT && !(this instanceof Buffer)) {
    return new Buffer(arg, encodingOrOffset, length)
  }

  // Common case.
  if (typeof arg === 'number') {
    if (typeof encodingOrOffset === 'string') {
      throw new Error(
        'If encoding is specified then the first argument must be a string'
      )
    }
    return allocUnsafe(this, arg)
  }
  return from(this, arg, encodingOrOffset, length)
}

Buffer.poolSize = 8192; // not used by this implementation

// TODO: Legacy, not needed anymore. Remove in next major version.
Buffer._augment = function (arr) {
  arr.__proto__ = Buffer.prototype;
  return arr
};

function from (that, value, encodingOrOffset, length) {
  if (typeof value === 'number') {
    throw new TypeError('"value" argument must not be a number')
  }

  if (typeof ArrayBuffer !== 'undefined' && value instanceof ArrayBuffer) {
    return fromArrayBuffer(that, value, encodingOrOffset, length)
  }

  if (typeof value === 'string') {
    return fromString(that, value, encodingOrOffset)
  }

  return fromObject(that, value)
}

/**
 * Functionally equivalent to Buffer(arg, encoding) but throws a TypeError
 * if value is a number.
 * Buffer.from(str[, encoding])
 * Buffer.from(array)
 * Buffer.from(buffer)
 * Buffer.from(arrayBuffer[, byteOffset[, length]])
 **/
Buffer.from = function (value, encodingOrOffset, length) {
  return from(null, value, encodingOrOffset, length)
};

if (Buffer.TYPED_ARRAY_SUPPORT) {
  Buffer.prototype.__proto__ = Uint8Array.prototype;
  Buffer.__proto__ = Uint8Array;
}

function assertSize (size) {
  if (typeof size !== 'number') {
    throw new TypeError('"size" argument must be a number')
  } else if (size < 0) {
    throw new RangeError('"size" argument must not be negative')
  }
}

function alloc (that, size, fill, encoding) {
  assertSize(size);
  if (size <= 0) {
    return createBuffer(that, size)
  }
  if (fill !== undefined) {
    // Only pay attention to encoding if it's a string. This
    // prevents accidentally sending in a number that would
    // be interpretted as a start offset.
    return typeof encoding === 'string'
      ? createBuffer(that, size).fill(fill, encoding)
      : createBuffer(that, size).fill(fill)
  }
  return createBuffer(that, size)
}

/**
 * Creates a new filled Buffer instance.
 * alloc(size[, fill[, encoding]])
 **/
Buffer.alloc = function (size, fill, encoding) {
  return alloc(null, size, fill, encoding)
};

function allocUnsafe (that, size) {
  assertSize(size);
  that = createBuffer(that, size < 0 ? 0 : checked(size) | 0);
  if (!Buffer.TYPED_ARRAY_SUPPORT) {
    for (var i = 0; i < size; ++i) {
      that[i] = 0;
    }
  }
  return that
}

/**
 * Equivalent to Buffer(num), by default creates a non-zero-filled Buffer instance.
 * */
Buffer.allocUnsafe = function (size) {
  return allocUnsafe(null, size)
};
/**
 * Equivalent to SlowBuffer(num), by default creates a non-zero-filled Buffer instance.
 */
Buffer.allocUnsafeSlow = function (size) {
  return allocUnsafe(null, size)
};

function fromString (that, string, encoding) {
  if (typeof encoding !== 'string' || encoding === '') {
    encoding = 'utf8';
  }

  if (!Buffer.isEncoding(encoding)) {
    throw new TypeError('"encoding" must be a valid string encoding')
  }

  var length = byteLength(string, encoding) | 0;
  that = createBuffer(that, length);

  var actual = that.write(string, encoding);

  if (actual !== length) {
    // Writing a hex string, for example, that contains invalid characters will
    // cause everything after the first invalid character to be ignored. (e.g.
    // 'abxxcd' will be treated as 'ab')
    that = that.slice(0, actual);
  }

  return that
}

function fromArrayLike (that, array) {
  var length = array.length < 0 ? 0 : checked(array.length) | 0;
  that = createBuffer(that, length);
  for (var i = 0; i < length; i += 1) {
    that[i] = array[i] & 255;
  }
  return that
}

function fromArrayBuffer (that, array, byteOffset, length) {
  array.byteLength; // this throws if `array` is not a valid ArrayBuffer

  if (byteOffset < 0 || array.byteLength < byteOffset) {
    throw new RangeError('\'offset\' is out of bounds')
  }

  if (array.byteLength < byteOffset + (length || 0)) {
    throw new RangeError('\'length\' is out of bounds')
  }

  if (byteOffset === undefined && length === undefined) {
    array = new Uint8Array(array);
  } else if (length === undefined) {
    array = new Uint8Array(array, byteOffset);
  } else {
    array = new Uint8Array(array, byteOffset, length);
  }

  if (Buffer.TYPED_ARRAY_SUPPORT) {
    // Return an augmented `Uint8Array` instance, for best performance
    that = array;
    that.__proto__ = Buffer.prototype;
  } else {
    // Fallback: Return an object instance of the Buffer class
    that = fromArrayLike(that, array);
  }
  return that
}

function fromObject (that, obj) {
  if (internalIsBuffer(obj)) {
    var len = checked(obj.length) | 0;
    that = createBuffer(that, len);

    if (that.length === 0) {
      return that
    }

    obj.copy(that, 0, 0, len);
    return that
  }

  if (obj) {
    if ((typeof ArrayBuffer !== 'undefined' &&
        obj.buffer instanceof ArrayBuffer) || 'length' in obj) {
      if (typeof obj.length !== 'number' || isnan(obj.length)) {
        return createBuffer(that, 0)
      }
      return fromArrayLike(that, obj)
    }

    if (obj.type === 'Buffer' && isArray(obj.data)) {
      return fromArrayLike(that, obj.data)
    }
  }

  throw new TypeError('First argument must be a string, Buffer, ArrayBuffer, Array, or array-like object.')
}

function checked (length) {
  // Note: cannot use `length < kMaxLength()` here because that fails when
  // length is NaN (which is otherwise coerced to zero.)
  if (length >= kMaxLength()) {
    throw new RangeError('Attempt to allocate Buffer larger than maximum ' +
                         'size: 0x' + kMaxLength().toString(16) + ' bytes')
  }
  return length | 0
}

function SlowBuffer (length) {
  if (+length != length) { // eslint-disable-line eqeqeq
    length = 0;
  }
  return Buffer.alloc(+length)
}
Buffer.isBuffer = isBuffer;
function internalIsBuffer (b) {
  return !!(b != null && b._isBuffer)
}

Buffer.compare = function compare (a, b) {
  if (!internalIsBuffer(a) || !internalIsBuffer(b)) {
    throw new TypeError('Arguments must be Buffers')
  }

  if (a === b) return 0

  var x = a.length;
  var y = b.length;

  for (var i = 0, len = Math.min(x, y); i < len; ++i) {
    if (a[i] !== b[i]) {
      x = a[i];
      y = b[i];
      break
    }
  }

  if (x < y) return -1
  if (y < x) return 1
  return 0
};

Buffer.isEncoding = function isEncoding (encoding) {
  switch (String(encoding).toLowerCase()) {
    case 'hex':
    case 'utf8':
    case 'utf-8':
    case 'ascii':
    case 'latin1':
    case 'binary':
    case 'base64':
    case 'ucs2':
    case 'ucs-2':
    case 'utf16le':
    case 'utf-16le':
      return true
    default:
      return false
  }
};

Buffer.concat = function concat (list, length) {
  if (!isArray(list)) {
    throw new TypeError('"list" argument must be an Array of Buffers')
  }

  if (list.length === 0) {
    return Buffer.alloc(0)
  }

  var i;
  if (length === undefined) {
    length = 0;
    for (i = 0; i < list.length; ++i) {
      length += list[i].length;
    }
  }

  var buffer = Buffer.allocUnsafe(length);
  var pos = 0;
  for (i = 0; i < list.length; ++i) {
    var buf = list[i];
    if (!internalIsBuffer(buf)) {
      throw new TypeError('"list" argument must be an Array of Buffers')
    }
    buf.copy(buffer, pos);
    pos += buf.length;
  }
  return buffer
};

function byteLength (string, encoding) {
  if (internalIsBuffer(string)) {
    return string.length
  }
  if (typeof ArrayBuffer !== 'undefined' && typeof ArrayBuffer.isView === 'function' &&
      (ArrayBuffer.isView(string) || string instanceof ArrayBuffer)) {
    return string.byteLength
  }
  if (typeof string !== 'string') {
    string = '' + string;
  }

  var len = string.length;
  if (len === 0) return 0

  // Use a for loop to avoid recursion
  var loweredCase = false;
  for (;;) {
    switch (encoding) {
      case 'ascii':
      case 'latin1':
      case 'binary':
        return len
      case 'utf8':
      case 'utf-8':
      case undefined:
        return utf8ToBytes(string).length
      case 'ucs2':
      case 'ucs-2':
      case 'utf16le':
      case 'utf-16le':
        return len * 2
      case 'hex':
        return len >>> 1
      case 'base64':
        return base64ToBytes(string).length
      default:
        if (loweredCase) return utf8ToBytes(string).length // assume utf8
        encoding = ('' + encoding).toLowerCase();
        loweredCase = true;
    }
  }
}
Buffer.byteLength = byteLength;

function slowToString (encoding, start, end) {
  var loweredCase = false;

  // No need to verify that "this.length <= MAX_UINT32" since it's a read-only
  // property of a typed array.

  // This behaves neither like String nor Uint8Array in that we set start/end
  // to their upper/lower bounds if the value passed is out of range.
  // undefined is handled specially as per ECMA-262 6th Edition,
  // Section 13.3.3.7 Runtime Semantics: KeyedBindingInitialization.
  if (start === undefined || start < 0) {
    start = 0;
  }
  // Return early if start > this.length. Done here to prevent potential uint32
  // coercion fail below.
  if (start > this.length) {
    return ''
  }

  if (end === undefined || end > this.length) {
    end = this.length;
  }

  if (end <= 0) {
    return ''
  }

  // Force coersion to uint32. This will also coerce falsey/NaN values to 0.
  end >>>= 0;
  start >>>= 0;

  if (end <= start) {
    return ''
  }

  if (!encoding) encoding = 'utf8';

  while (true) {
    switch (encoding) {
      case 'hex':
        return hexSlice(this, start, end)

      case 'utf8':
      case 'utf-8':
        return utf8Slice(this, start, end)

      case 'ascii':
        return asciiSlice(this, start, end)

      case 'latin1':
      case 'binary':
        return latin1Slice(this, start, end)

      case 'base64':
        return base64Slice(this, start, end)

      case 'ucs2':
      case 'ucs-2':
      case 'utf16le':
      case 'utf-16le':
        return utf16leSlice(this, start, end)

      default:
        if (loweredCase) throw new TypeError('Unknown encoding: ' + encoding)
        encoding = (encoding + '').toLowerCase();
        loweredCase = true;
    }
  }
}

// The property is used by `Buffer.isBuffer` and `is-buffer` (in Safari 5-7) to detect
// Buffer instances.
Buffer.prototype._isBuffer = true;

function swap$1 (b, n, m) {
  var i = b[n];
  b[n] = b[m];
  b[m] = i;
}

Buffer.prototype.swap16 = function swap16 () {
  var len = this.length;
  if (len % 2 !== 0) {
    throw new RangeError('Buffer size must be a multiple of 16-bits')
  }
  for (var i = 0; i < len; i += 2) {
    swap$1(this, i, i + 1);
  }
  return this
};

Buffer.prototype.swap32 = function swap32 () {
  var len = this.length;
  if (len % 4 !== 0) {
    throw new RangeError('Buffer size must be a multiple of 32-bits')
  }
  for (var i = 0; i < len; i += 4) {
    swap$1(this, i, i + 3);
    swap$1(this, i + 1, i + 2);
  }
  return this
};

Buffer.prototype.swap64 = function swap64 () {
  var len = this.length;
  if (len % 8 !== 0) {
    throw new RangeError('Buffer size must be a multiple of 64-bits')
  }
  for (var i = 0; i < len; i += 8) {
    swap$1(this, i, i + 7);
    swap$1(this, i + 1, i + 6);
    swap$1(this, i + 2, i + 5);
    swap$1(this, i + 3, i + 4);
  }
  return this
};

Buffer.prototype.toString = function toString () {
  var length = this.length | 0;
  if (length === 0) return ''
  if (arguments.length === 0) return utf8Slice(this, 0, length)
  return slowToString.apply(this, arguments)
};

Buffer.prototype.equals = function equals (b) {
  if (!internalIsBuffer(b)) throw new TypeError('Argument must be a Buffer')
  if (this === b) return true
  return Buffer.compare(this, b) === 0
};

Buffer.prototype.inspect = function inspect () {
  var str = '';
  var max = INSPECT_MAX_BYTES;
  if (this.length > 0) {
    str = this.toString('hex', 0, max).match(/.{2}/g).join(' ');
    if (this.length > max) str += ' ... ';
  }
  return '<Buffer ' + str + '>'
};

Buffer.prototype.compare = function compare (target, start, end, thisStart, thisEnd) {
  if (!internalIsBuffer(target)) {
    throw new TypeError('Argument must be a Buffer')
  }

  if (start === undefined) {
    start = 0;
  }
  if (end === undefined) {
    end = target ? target.length : 0;
  }
  if (thisStart === undefined) {
    thisStart = 0;
  }
  if (thisEnd === undefined) {
    thisEnd = this.length;
  }

  if (start < 0 || end > target.length || thisStart < 0 || thisEnd > this.length) {
    throw new RangeError('out of range index')
  }

  if (thisStart >= thisEnd && start >= end) {
    return 0
  }
  if (thisStart >= thisEnd) {
    return -1
  }
  if (start >= end) {
    return 1
  }

  start >>>= 0;
  end >>>= 0;
  thisStart >>>= 0;
  thisEnd >>>= 0;

  if (this === target) return 0

  var x = thisEnd - thisStart;
  var y = end - start;
  var len = Math.min(x, y);

  var thisCopy = this.slice(thisStart, thisEnd);
  var targetCopy = target.slice(start, end);

  for (var i = 0; i < len; ++i) {
    if (thisCopy[i] !== targetCopy[i]) {
      x = thisCopy[i];
      y = targetCopy[i];
      break
    }
  }

  if (x < y) return -1
  if (y < x) return 1
  return 0
};

// Finds either the first index of `val` in `buffer` at offset >= `byteOffset`,
// OR the last index of `val` in `buffer` at offset <= `byteOffset`.
//
// Arguments:
// - buffer - a Buffer to search
// - val - a string, Buffer, or number
// - byteOffset - an index into `buffer`; will be clamped to an int32
// - encoding - an optional encoding, relevant is val is a string
// - dir - true for indexOf, false for lastIndexOf
function bidirectionalIndexOf (buffer, val, byteOffset, encoding, dir) {
  // Empty buffer means no match
  if (buffer.length === 0) return -1

  // Normalize byteOffset
  if (typeof byteOffset === 'string') {
    encoding = byteOffset;
    byteOffset = 0;
  } else if (byteOffset > 0x7fffffff) {
    byteOffset = 0x7fffffff;
  } else if (byteOffset < -0x80000000) {
    byteOffset = -0x80000000;
  }
  byteOffset = +byteOffset;  // Coerce to Number.
  if (isNaN(byteOffset)) {
    // byteOffset: it it's undefined, null, NaN, "foo", etc, search whole buffer
    byteOffset = dir ? 0 : (buffer.length - 1);
  }

  // Normalize byteOffset: negative offsets start from the end of the buffer
  if (byteOffset < 0) byteOffset = buffer.length + byteOffset;
  if (byteOffset >= buffer.length) {
    if (dir) return -1
    else byteOffset = buffer.length - 1;
  } else if (byteOffset < 0) {
    if (dir) byteOffset = 0;
    else return -1
  }

  // Normalize val
  if (typeof val === 'string') {
    val = Buffer.from(val, encoding);
  }

  // Finally, search either indexOf (if dir is true) or lastIndexOf
  if (internalIsBuffer(val)) {
    // Special case: looking for empty string/buffer always fails
    if (val.length === 0) {
      return -1
    }
    return arrayIndexOf(buffer, val, byteOffset, encoding, dir)
  } else if (typeof val === 'number') {
    val = val & 0xFF; // Search for a byte value [0-255]
    if (Buffer.TYPED_ARRAY_SUPPORT &&
        typeof Uint8Array.prototype.indexOf === 'function') {
      if (dir) {
        return Uint8Array.prototype.indexOf.call(buffer, val, byteOffset)
      } else {
        return Uint8Array.prototype.lastIndexOf.call(buffer, val, byteOffset)
      }
    }
    return arrayIndexOf(buffer, [ val ], byteOffset, encoding, dir)
  }

  throw new TypeError('val must be string, number or Buffer')
}

function arrayIndexOf (arr, val, byteOffset, encoding, dir) {
  var indexSize = 1;
  var arrLength = arr.length;
  var valLength = val.length;

  if (encoding !== undefined) {
    encoding = String(encoding).toLowerCase();
    if (encoding === 'ucs2' || encoding === 'ucs-2' ||
        encoding === 'utf16le' || encoding === 'utf-16le') {
      if (arr.length < 2 || val.length < 2) {
        return -1
      }
      indexSize = 2;
      arrLength /= 2;
      valLength /= 2;
      byteOffset /= 2;
    }
  }

  function read (buf, i) {
    if (indexSize === 1) {
      return buf[i]
    } else {
      return buf.readUInt16BE(i * indexSize)
    }
  }

  var i;
  if (dir) {
    var foundIndex = -1;
    for (i = byteOffset; i < arrLength; i++) {
      if (read(arr, i) === read(val, foundIndex === -1 ? 0 : i - foundIndex)) {
        if (foundIndex === -1) foundIndex = i;
        if (i - foundIndex + 1 === valLength) return foundIndex * indexSize
      } else {
        if (foundIndex !== -1) i -= i - foundIndex;
        foundIndex = -1;
      }
    }
  } else {
    if (byteOffset + valLength > arrLength) byteOffset = arrLength - valLength;
    for (i = byteOffset; i >= 0; i--) {
      var found = true;
      for (var j = 0; j < valLength; j++) {
        if (read(arr, i + j) !== read(val, j)) {
          found = false;
          break
        }
      }
      if (found) return i
    }
  }

  return -1
}

Buffer.prototype.includes = function includes (val, byteOffset, encoding) {
  return this.indexOf(val, byteOffset, encoding) !== -1
};

Buffer.prototype.indexOf = function indexOf (val, byteOffset, encoding) {
  return bidirectionalIndexOf(this, val, byteOffset, encoding, true)
};

Buffer.prototype.lastIndexOf = function lastIndexOf (val, byteOffset, encoding) {
  return bidirectionalIndexOf(this, val, byteOffset, encoding, false)
};

function hexWrite (buf, string, offset, length) {
  offset = Number(offset) || 0;
  var remaining = buf.length - offset;
  if (!length) {
    length = remaining;
  } else {
    length = Number(length);
    if (length > remaining) {
      length = remaining;
    }
  }

  // must be an even number of digits
  var strLen = string.length;
  if (strLen % 2 !== 0) throw new TypeError('Invalid hex string')

  if (length > strLen / 2) {
    length = strLen / 2;
  }
  for (var i = 0; i < length; ++i) {
    var parsed = parseInt(string.substr(i * 2, 2), 16);
    if (isNaN(parsed)) return i
    buf[offset + i] = parsed;
  }
  return i
}

function utf8Write (buf, string, offset, length) {
  return blitBuffer(utf8ToBytes(string, buf.length - offset), buf, offset, length)
}

function asciiWrite (buf, string, offset, length) {
  return blitBuffer(asciiToBytes(string), buf, offset, length)
}

function latin1Write (buf, string, offset, length) {
  return asciiWrite(buf, string, offset, length)
}

function base64Write (buf, string, offset, length) {
  return blitBuffer(base64ToBytes(string), buf, offset, length)
}

function ucs2Write (buf, string, offset, length) {
  return blitBuffer(utf16leToBytes(string, buf.length - offset), buf, offset, length)
}

Buffer.prototype.write = function write (string, offset, length, encoding) {
  // Buffer#write(string)
  if (offset === undefined) {
    encoding = 'utf8';
    length = this.length;
    offset = 0;
  // Buffer#write(string, encoding)
  } else if (length === undefined && typeof offset === 'string') {
    encoding = offset;
    length = this.length;
    offset = 0;
  // Buffer#write(string, offset[, length][, encoding])
  } else if (isFinite(offset)) {
    offset = offset | 0;
    if (isFinite(length)) {
      length = length | 0;
      if (encoding === undefined) encoding = 'utf8';
    } else {
      encoding = length;
      length = undefined;
    }
  // legacy write(string, encoding, offset, length) - remove in v0.13
  } else {
    throw new Error(
      'Buffer.write(string, encoding, offset[, length]) is no longer supported'
    )
  }

  var remaining = this.length - offset;
  if (length === undefined || length > remaining) length = remaining;

  if ((string.length > 0 && (length < 0 || offset < 0)) || offset > this.length) {
    throw new RangeError('Attempt to write outside buffer bounds')
  }

  if (!encoding) encoding = 'utf8';

  var loweredCase = false;
  for (;;) {
    switch (encoding) {
      case 'hex':
        return hexWrite(this, string, offset, length)

      case 'utf8':
      case 'utf-8':
        return utf8Write(this, string, offset, length)

      case 'ascii':
        return asciiWrite(this, string, offset, length)

      case 'latin1':
      case 'binary':
        return latin1Write(this, string, offset, length)

      case 'base64':
        // Warning: maxLength not taken into account in base64Write
        return base64Write(this, string, offset, length)

      case 'ucs2':
      case 'ucs-2':
      case 'utf16le':
      case 'utf-16le':
        return ucs2Write(this, string, offset, length)

      default:
        if (loweredCase) throw new TypeError('Unknown encoding: ' + encoding)
        encoding = ('' + encoding).toLowerCase();
        loweredCase = true;
    }
  }
};

Buffer.prototype.toJSON = function toJSON () {
  return {
    type: 'Buffer',
    data: Array.prototype.slice.call(this._arr || this, 0)
  }
};

function base64Slice (buf, start, end) {
  if (start === 0 && end === buf.length) {
    return fromByteArray(buf)
  } else {
    return fromByteArray(buf.slice(start, end))
  }
}

function utf8Slice (buf, start, end) {
  end = Math.min(buf.length, end);
  var res = [];

  var i = start;
  while (i < end) {
    var firstByte = buf[i];
    var codePoint = null;
    var bytesPerSequence = (firstByte > 0xEF) ? 4
      : (firstByte > 0xDF) ? 3
      : (firstByte > 0xBF) ? 2
      : 1;

    if (i + bytesPerSequence <= end) {
      var secondByte, thirdByte, fourthByte, tempCodePoint;

      switch (bytesPerSequence) {
        case 1:
          if (firstByte < 0x80) {
            codePoint = firstByte;
          }
          break
        case 2:
          secondByte = buf[i + 1];
          if ((secondByte & 0xC0) === 0x80) {
            tempCodePoint = (firstByte & 0x1F) << 0x6 | (secondByte & 0x3F);
            if (tempCodePoint > 0x7F) {
              codePoint = tempCodePoint;
            }
          }
          break
        case 3:
          secondByte = buf[i + 1];
          thirdByte = buf[i + 2];
          if ((secondByte & 0xC0) === 0x80 && (thirdByte & 0xC0) === 0x80) {
            tempCodePoint = (firstByte & 0xF) << 0xC | (secondByte & 0x3F) << 0x6 | (thirdByte & 0x3F);
            if (tempCodePoint > 0x7FF && (tempCodePoint < 0xD800 || tempCodePoint > 0xDFFF)) {
              codePoint = tempCodePoint;
            }
          }
          break
        case 4:
          secondByte = buf[i + 1];
          thirdByte = buf[i + 2];
          fourthByte = buf[i + 3];
          if ((secondByte & 0xC0) === 0x80 && (thirdByte & 0xC0) === 0x80 && (fourthByte & 0xC0) === 0x80) {
            tempCodePoint = (firstByte & 0xF) << 0x12 | (secondByte & 0x3F) << 0xC | (thirdByte & 0x3F) << 0x6 | (fourthByte & 0x3F);
            if (tempCodePoint > 0xFFFF && tempCodePoint < 0x110000) {
              codePoint = tempCodePoint;
            }
          }
      }
    }

    if (codePoint === null) {
      // we did not generate a valid codePoint so insert a
      // replacement char (U+FFFD) and advance only 1 byte
      codePoint = 0xFFFD;
      bytesPerSequence = 1;
    } else if (codePoint > 0xFFFF) {
      // encode to utf16 (surrogate pair dance)
      codePoint -= 0x10000;
      res.push(codePoint >>> 10 & 0x3FF | 0xD800);
      codePoint = 0xDC00 | codePoint & 0x3FF;
    }

    res.push(codePoint);
    i += bytesPerSequence;
  }

  return decodeCodePointsArray(res)
}

// Based on http://stackoverflow.com/a/22747272/680742, the browser with
// the lowest limit is Chrome, with 0x10000 args.
// We go 1 magnitude less, for safety
var MAX_ARGUMENTS_LENGTH = 0x1000;

function decodeCodePointsArray (codePoints) {
  var len = codePoints.length;
  if (len <= MAX_ARGUMENTS_LENGTH) {
    return String.fromCharCode.apply(String, codePoints) // avoid extra slice()
  }

  // Decode in chunks to avoid "call stack size exceeded".
  var res = '';
  var i = 0;
  while (i < len) {
    res += String.fromCharCode.apply(
      String,
      codePoints.slice(i, i += MAX_ARGUMENTS_LENGTH)
    );
  }
  return res
}

function asciiSlice (buf, start, end) {
  var ret = '';
  end = Math.min(buf.length, end);

  for (var i = start; i < end; ++i) {
    ret += String.fromCharCode(buf[i] & 0x7F);
  }
  return ret
}

function latin1Slice (buf, start, end) {
  var ret = '';
  end = Math.min(buf.length, end);

  for (var i = start; i < end; ++i) {
    ret += String.fromCharCode(buf[i]);
  }
  return ret
}

function hexSlice (buf, start, end) {
  var len = buf.length;

  if (!start || start < 0) start = 0;
  if (!end || end < 0 || end > len) end = len;

  var out = '';
  for (var i = start; i < end; ++i) {
    out += toHex(buf[i]);
  }
  return out
}

function utf16leSlice (buf, start, end) {
  var bytes = buf.slice(start, end);
  var res = '';
  for (var i = 0; i < bytes.length; i += 2) {
    res += String.fromCharCode(bytes[i] + bytes[i + 1] * 256);
  }
  return res
}

Buffer.prototype.slice = function slice (start, end) {
  var len = this.length;
  start = ~~start;
  end = end === undefined ? len : ~~end;

  if (start < 0) {
    start += len;
    if (start < 0) start = 0;
  } else if (start > len) {
    start = len;
  }

  if (end < 0) {
    end += len;
    if (end < 0) end = 0;
  } else if (end > len) {
    end = len;
  }

  if (end < start) end = start;

  var newBuf;
  if (Buffer.TYPED_ARRAY_SUPPORT) {
    newBuf = this.subarray(start, end);
    newBuf.__proto__ = Buffer.prototype;
  } else {
    var sliceLen = end - start;
    newBuf = new Buffer(sliceLen, undefined);
    for (var i = 0; i < sliceLen; ++i) {
      newBuf[i] = this[i + start];
    }
  }

  return newBuf
};

/*
 * Need to make sure that buffer isn't trying to write out of bounds.
 */
function checkOffset (offset, ext, length) {
  if ((offset % 1) !== 0 || offset < 0) throw new RangeError('offset is not uint')
  if (offset + ext > length) throw new RangeError('Trying to access beyond buffer length')
}

Buffer.prototype.readUIntLE = function readUIntLE (offset, byteLength, noAssert) {
  offset = offset | 0;
  byteLength = byteLength | 0;
  if (!noAssert) checkOffset(offset, byteLength, this.length);

  var val = this[offset];
  var mul = 1;
  var i = 0;
  while (++i < byteLength && (mul *= 0x100)) {
    val += this[offset + i] * mul;
  }

  return val
};

Buffer.prototype.readUIntBE = function readUIntBE (offset, byteLength, noAssert) {
  offset = offset | 0;
  byteLength = byteLength | 0;
  if (!noAssert) {
    checkOffset(offset, byteLength, this.length);
  }

  var val = this[offset + --byteLength];
  var mul = 1;
  while (byteLength > 0 && (mul *= 0x100)) {
    val += this[offset + --byteLength] * mul;
  }

  return val
};

Buffer.prototype.readUInt8 = function readUInt8 (offset, noAssert) {
  if (!noAssert) checkOffset(offset, 1, this.length);
  return this[offset]
};

Buffer.prototype.readUInt16LE = function readUInt16LE (offset, noAssert) {
  if (!noAssert) checkOffset(offset, 2, this.length);
  return this[offset] | (this[offset + 1] << 8)
};

Buffer.prototype.readUInt16BE = function readUInt16BE (offset, noAssert) {
  if (!noAssert) checkOffset(offset, 2, this.length);
  return (this[offset] << 8) | this[offset + 1]
};

Buffer.prototype.readUInt32LE = function readUInt32LE (offset, noAssert) {
  if (!noAssert) checkOffset(offset, 4, this.length);

  return ((this[offset]) |
      (this[offset + 1] << 8) |
      (this[offset + 2] << 16)) +
      (this[offset + 3] * 0x1000000)
};

Buffer.prototype.readUInt32BE = function readUInt32BE (offset, noAssert) {
  if (!noAssert) checkOffset(offset, 4, this.length);

  return (this[offset] * 0x1000000) +
    ((this[offset + 1] << 16) |
    (this[offset + 2] << 8) |
    this[offset + 3])
};

Buffer.prototype.readIntLE = function readIntLE (offset, byteLength, noAssert) {
  offset = offset | 0;
  byteLength = byteLength | 0;
  if (!noAssert) checkOffset(offset, byteLength, this.length);

  var val = this[offset];
  var mul = 1;
  var i = 0;
  while (++i < byteLength && (mul *= 0x100)) {
    val += this[offset + i] * mul;
  }
  mul *= 0x80;

  if (val >= mul) val -= Math.pow(2, 8 * byteLength);

  return val
};

Buffer.prototype.readIntBE = function readIntBE (offset, byteLength, noAssert) {
  offset = offset | 0;
  byteLength = byteLength | 0;
  if (!noAssert) checkOffset(offset, byteLength, this.length);

  var i = byteLength;
  var mul = 1;
  var val = this[offset + --i];
  while (i > 0 && (mul *= 0x100)) {
    val += this[offset + --i] * mul;
  }
  mul *= 0x80;

  if (val >= mul) val -= Math.pow(2, 8 * byteLength);

  return val
};

Buffer.prototype.readInt8 = function readInt8 (offset, noAssert) {
  if (!noAssert) checkOffset(offset, 1, this.length);
  if (!(this[offset] & 0x80)) return (this[offset])
  return ((0xff - this[offset] + 1) * -1)
};

Buffer.prototype.readInt16LE = function readInt16LE (offset, noAssert) {
  if (!noAssert) checkOffset(offset, 2, this.length);
  var val = this[offset] | (this[offset + 1] << 8);
  return (val & 0x8000) ? val | 0xFFFF0000 : val
};

Buffer.prototype.readInt16BE = function readInt16BE (offset, noAssert) {
  if (!noAssert) checkOffset(offset, 2, this.length);
  var val = this[offset + 1] | (this[offset] << 8);
  return (val & 0x8000) ? val | 0xFFFF0000 : val
};

Buffer.prototype.readInt32LE = function readInt32LE (offset, noAssert) {
  if (!noAssert) checkOffset(offset, 4, this.length);

  return (this[offset]) |
    (this[offset + 1] << 8) |
    (this[offset + 2] << 16) |
    (this[offset + 3] << 24)
};

Buffer.prototype.readInt32BE = function readInt32BE (offset, noAssert) {
  if (!noAssert) checkOffset(offset, 4, this.length);

  return (this[offset] << 24) |
    (this[offset + 1] << 16) |
    (this[offset + 2] << 8) |
    (this[offset + 3])
};

Buffer.prototype.readFloatLE = function readFloatLE (offset, noAssert) {
  if (!noAssert) checkOffset(offset, 4, this.length);
  return read(this, offset, true, 23, 4)
};

Buffer.prototype.readFloatBE = function readFloatBE (offset, noAssert) {
  if (!noAssert) checkOffset(offset, 4, this.length);
  return read(this, offset, false, 23, 4)
};

Buffer.prototype.readDoubleLE = function readDoubleLE (offset, noAssert) {
  if (!noAssert) checkOffset(offset, 8, this.length);
  return read(this, offset, true, 52, 8)
};

Buffer.prototype.readDoubleBE = function readDoubleBE (offset, noAssert) {
  if (!noAssert) checkOffset(offset, 8, this.length);
  return read(this, offset, false, 52, 8)
};

function checkInt (buf, value, offset, ext, max, min) {
  if (!internalIsBuffer(buf)) throw new TypeError('"buffer" argument must be a Buffer instance')
  if (value > max || value < min) throw new RangeError('"value" argument is out of bounds')
  if (offset + ext > buf.length) throw new RangeError('Index out of range')
}

Buffer.prototype.writeUIntLE = function writeUIntLE (value, offset, byteLength, noAssert) {
  value = +value;
  offset = offset | 0;
  byteLength = byteLength | 0;
  if (!noAssert) {
    var maxBytes = Math.pow(2, 8 * byteLength) - 1;
    checkInt(this, value, offset, byteLength, maxBytes, 0);
  }

  var mul = 1;
  var i = 0;
  this[offset] = value & 0xFF;
  while (++i < byteLength && (mul *= 0x100)) {
    this[offset + i] = (value / mul) & 0xFF;
  }

  return offset + byteLength
};

Buffer.prototype.writeUIntBE = function writeUIntBE (value, offset, byteLength, noAssert) {
  value = +value;
  offset = offset | 0;
  byteLength = byteLength | 0;
  if (!noAssert) {
    var maxBytes = Math.pow(2, 8 * byteLength) - 1;
    checkInt(this, value, offset, byteLength, maxBytes, 0);
  }

  var i = byteLength - 1;
  var mul = 1;
  this[offset + i] = value & 0xFF;
  while (--i >= 0 && (mul *= 0x100)) {
    this[offset + i] = (value / mul) & 0xFF;
  }

  return offset + byteLength
};

Buffer.prototype.writeUInt8 = function writeUInt8 (value, offset, noAssert) {
  value = +value;
  offset = offset | 0;
  if (!noAssert) checkInt(this, value, offset, 1, 0xff, 0);
  if (!Buffer.TYPED_ARRAY_SUPPORT) value = Math.floor(value);
  this[offset] = (value & 0xff);
  return offset + 1
};

function objectWriteUInt16 (buf, value, offset, littleEndian) {
  if (value < 0) value = 0xffff + value + 1;
  for (var i = 0, j = Math.min(buf.length - offset, 2); i < j; ++i) {
    buf[offset + i] = (value & (0xff << (8 * (littleEndian ? i : 1 - i)))) >>>
      (littleEndian ? i : 1 - i) * 8;
  }
}

Buffer.prototype.writeUInt16LE = function writeUInt16LE (value, offset, noAssert) {
  value = +value;
  offset = offset | 0;
  if (!noAssert) checkInt(this, value, offset, 2, 0xffff, 0);
  if (Buffer.TYPED_ARRAY_SUPPORT) {
    this[offset] = (value & 0xff);
    this[offset + 1] = (value >>> 8);
  } else {
    objectWriteUInt16(this, value, offset, true);
  }
  return offset + 2
};

Buffer.prototype.writeUInt16BE = function writeUInt16BE (value, offset, noAssert) {
  value = +value;
  offset = offset | 0;
  if (!noAssert) checkInt(this, value, offset, 2, 0xffff, 0);
  if (Buffer.TYPED_ARRAY_SUPPORT) {
    this[offset] = (value >>> 8);
    this[offset + 1] = (value & 0xff);
  } else {
    objectWriteUInt16(this, value, offset, false);
  }
  return offset + 2
};

function objectWriteUInt32 (buf, value, offset, littleEndian) {
  if (value < 0) value = 0xffffffff + value + 1;
  for (var i = 0, j = Math.min(buf.length - offset, 4); i < j; ++i) {
    buf[offset + i] = (value >>> (littleEndian ? i : 3 - i) * 8) & 0xff;
  }
}

Buffer.prototype.writeUInt32LE = function writeUInt32LE (value, offset, noAssert) {
  value = +value;
  offset = offset | 0;
  if (!noAssert) checkInt(this, value, offset, 4, 0xffffffff, 0);
  if (Buffer.TYPED_ARRAY_SUPPORT) {
    this[offset + 3] = (value >>> 24);
    this[offset + 2] = (value >>> 16);
    this[offset + 1] = (value >>> 8);
    this[offset] = (value & 0xff);
  } else {
    objectWriteUInt32(this, value, offset, true);
  }
  return offset + 4
};

Buffer.prototype.writeUInt32BE = function writeUInt32BE (value, offset, noAssert) {
  value = +value;
  offset = offset | 0;
  if (!noAssert) checkInt(this, value, offset, 4, 0xffffffff, 0);
  if (Buffer.TYPED_ARRAY_SUPPORT) {
    this[offset] = (value >>> 24);
    this[offset + 1] = (value >>> 16);
    this[offset + 2] = (value >>> 8);
    this[offset + 3] = (value & 0xff);
  } else {
    objectWriteUInt32(this, value, offset, false);
  }
  return offset + 4
};

Buffer.prototype.writeIntLE = function writeIntLE (value, offset, byteLength, noAssert) {
  value = +value;
  offset = offset | 0;
  if (!noAssert) {
    var limit = Math.pow(2, 8 * byteLength - 1);

    checkInt(this, value, offset, byteLength, limit - 1, -limit);
  }

  var i = 0;
  var mul = 1;
  var sub = 0;
  this[offset] = value & 0xFF;
  while (++i < byteLength && (mul *= 0x100)) {
    if (value < 0 && sub === 0 && this[offset + i - 1] !== 0) {
      sub = 1;
    }
    this[offset + i] = ((value / mul) >> 0) - sub & 0xFF;
  }

  return offset + byteLength
};

Buffer.prototype.writeIntBE = function writeIntBE (value, offset, byteLength, noAssert) {
  value = +value;
  offset = offset | 0;
  if (!noAssert) {
    var limit = Math.pow(2, 8 * byteLength - 1);

    checkInt(this, value, offset, byteLength, limit - 1, -limit);
  }

  var i = byteLength - 1;
  var mul = 1;
  var sub = 0;
  this[offset + i] = value & 0xFF;
  while (--i >= 0 && (mul *= 0x100)) {
    if (value < 0 && sub === 0 && this[offset + i + 1] !== 0) {
      sub = 1;
    }
    this[offset + i] = ((value / mul) >> 0) - sub & 0xFF;
  }

  return offset + byteLength
};

Buffer.prototype.writeInt8 = function writeInt8 (value, offset, noAssert) {
  value = +value;
  offset = offset | 0;
  if (!noAssert) checkInt(this, value, offset, 1, 0x7f, -0x80);
  if (!Buffer.TYPED_ARRAY_SUPPORT) value = Math.floor(value);
  if (value < 0) value = 0xff + value + 1;
  this[offset] = (value & 0xff);
  return offset + 1
};

Buffer.prototype.writeInt16LE = function writeInt16LE (value, offset, noAssert) {
  value = +value;
  offset = offset | 0;
  if (!noAssert) checkInt(this, value, offset, 2, 0x7fff, -0x8000);
  if (Buffer.TYPED_ARRAY_SUPPORT) {
    this[offset] = (value & 0xff);
    this[offset + 1] = (value >>> 8);
  } else {
    objectWriteUInt16(this, value, offset, true);
  }
  return offset + 2
};

Buffer.prototype.writeInt16BE = function writeInt16BE (value, offset, noAssert) {
  value = +value;
  offset = offset | 0;
  if (!noAssert) checkInt(this, value, offset, 2, 0x7fff, -0x8000);
  if (Buffer.TYPED_ARRAY_SUPPORT) {
    this[offset] = (value >>> 8);
    this[offset + 1] = (value & 0xff);
  } else {
    objectWriteUInt16(this, value, offset, false);
  }
  return offset + 2
};

Buffer.prototype.writeInt32LE = function writeInt32LE (value, offset, noAssert) {
  value = +value;
  offset = offset | 0;
  if (!noAssert) checkInt(this, value, offset, 4, 0x7fffffff, -0x80000000);
  if (Buffer.TYPED_ARRAY_SUPPORT) {
    this[offset] = (value & 0xff);
    this[offset + 1] = (value >>> 8);
    this[offset + 2] = (value >>> 16);
    this[offset + 3] = (value >>> 24);
  } else {
    objectWriteUInt32(this, value, offset, true);
  }
  return offset + 4
};

Buffer.prototype.writeInt32BE = function writeInt32BE (value, offset, noAssert) {
  value = +value;
  offset = offset | 0;
  if (!noAssert) checkInt(this, value, offset, 4, 0x7fffffff, -0x80000000);
  if (value < 0) value = 0xffffffff + value + 1;
  if (Buffer.TYPED_ARRAY_SUPPORT) {
    this[offset] = (value >>> 24);
    this[offset + 1] = (value >>> 16);
    this[offset + 2] = (value >>> 8);
    this[offset + 3] = (value & 0xff);
  } else {
    objectWriteUInt32(this, value, offset, false);
  }
  return offset + 4
};

function checkIEEE754 (buf, value, offset, ext, max, min) {
  if (offset + ext > buf.length) throw new RangeError('Index out of range')
  if (offset < 0) throw new RangeError('Index out of range')
}

function writeFloat (buf, value, offset, littleEndian, noAssert) {
  if (!noAssert) {
    checkIEEE754(buf, value, offset, 4, 3.4028234663852886e+38, -3.4028234663852886e+38);
  }
  write(buf, value, offset, littleEndian, 23, 4);
  return offset + 4
}

Buffer.prototype.writeFloatLE = function writeFloatLE (value, offset, noAssert) {
  return writeFloat(this, value, offset, true, noAssert)
};

Buffer.prototype.writeFloatBE = function writeFloatBE (value, offset, noAssert) {
  return writeFloat(this, value, offset, false, noAssert)
};

function writeDouble (buf, value, offset, littleEndian, noAssert) {
  if (!noAssert) {
    checkIEEE754(buf, value, offset, 8, 1.7976931348623157E+308, -1.7976931348623157E+308);
  }
  write(buf, value, offset, littleEndian, 52, 8);
  return offset + 8
}

Buffer.prototype.writeDoubleLE = function writeDoubleLE (value, offset, noAssert) {
  return writeDouble(this, value, offset, true, noAssert)
};

Buffer.prototype.writeDoubleBE = function writeDoubleBE (value, offset, noAssert) {
  return writeDouble(this, value, offset, false, noAssert)
};

// copy(targetBuffer, targetStart=0, sourceStart=0, sourceEnd=buffer.length)
Buffer.prototype.copy = function copy (target, targetStart, start, end) {
  if (!start) start = 0;
  if (!end && end !== 0) end = this.length;
  if (targetStart >= target.length) targetStart = target.length;
  if (!targetStart) targetStart = 0;
  if (end > 0 && end < start) end = start;

  // Copy 0 bytes; we're done
  if (end === start) return 0
  if (target.length === 0 || this.length === 0) return 0

  // Fatal error conditions
  if (targetStart < 0) {
    throw new RangeError('targetStart out of bounds')
  }
  if (start < 0 || start >= this.length) throw new RangeError('sourceStart out of bounds')
  if (end < 0) throw new RangeError('sourceEnd out of bounds')

  // Are we oob?
  if (end > this.length) end = this.length;
  if (target.length - targetStart < end - start) {
    end = target.length - targetStart + start;
  }

  var len = end - start;
  var i;

  if (this === target && start < targetStart && targetStart < end) {
    // descending copy from end
    for (i = len - 1; i >= 0; --i) {
      target[i + targetStart] = this[i + start];
    }
  } else if (len < 1000 || !Buffer.TYPED_ARRAY_SUPPORT) {
    // ascending copy from start
    for (i = 0; i < len; ++i) {
      target[i + targetStart] = this[i + start];
    }
  } else {
    Uint8Array.prototype.set.call(
      target,
      this.subarray(start, start + len),
      targetStart
    );
  }

  return len
};

// Usage:
//    buffer.fill(number[, offset[, end]])
//    buffer.fill(buffer[, offset[, end]])
//    buffer.fill(string[, offset[, end]][, encoding])
Buffer.prototype.fill = function fill (val, start, end, encoding) {
  // Handle string cases:
  if (typeof val === 'string') {
    if (typeof start === 'string') {
      encoding = start;
      start = 0;
      end = this.length;
    } else if (typeof end === 'string') {
      encoding = end;
      end = this.length;
    }
    if (val.length === 1) {
      var code = val.charCodeAt(0);
      if (code < 256) {
        val = code;
      }
    }
    if (encoding !== undefined && typeof encoding !== 'string') {
      throw new TypeError('encoding must be a string')
    }
    if (typeof encoding === 'string' && !Buffer.isEncoding(encoding)) {
      throw new TypeError('Unknown encoding: ' + encoding)
    }
  } else if (typeof val === 'number') {
    val = val & 255;
  }

  // Invalid ranges are not set to a default, so can range check early.
  if (start < 0 || this.length < start || this.length < end) {
    throw new RangeError('Out of range index')
  }

  if (end <= start) {
    return this
  }

  start = start >>> 0;
  end = end === undefined ? this.length : end >>> 0;

  if (!val) val = 0;

  var i;
  if (typeof val === 'number') {
    for (i = start; i < end; ++i) {
      this[i] = val;
    }
  } else {
    var bytes = internalIsBuffer(val)
      ? val
      : utf8ToBytes(new Buffer(val, encoding).toString());
    var len = bytes.length;
    for (i = 0; i < end - start; ++i) {
      this[i + start] = bytes[i % len];
    }
  }

  return this
};

// HELPER FUNCTIONS
// ================

var INVALID_BASE64_RE = /[^+\/0-9A-Za-z-_]/g;

function base64clean (str) {
  // Node strips out invalid characters like \n and \t from the string, base64-js does not
  str = stringtrim(str).replace(INVALID_BASE64_RE, '');
  // Node converts strings with length < 2 to ''
  if (str.length < 2) return ''
  // Node allows for non-padded base64 strings (missing trailing ===), base64-js does not
  while (str.length % 4 !== 0) {
    str = str + '=';
  }
  return str
}

function stringtrim (str) {
  if (str.trim) return str.trim()
  return str.replace(/^\s+|\s+$/g, '')
}

function toHex (n) {
  if (n < 16) return '0' + n.toString(16)
  return n.toString(16)
}

function utf8ToBytes (string, units) {
  units = units || Infinity;
  var codePoint;
  var length = string.length;
  var leadSurrogate = null;
  var bytes = [];

  for (var i = 0; i < length; ++i) {
    codePoint = string.charCodeAt(i);

    // is surrogate component
    if (codePoint > 0xD7FF && codePoint < 0xE000) {
      // last char was a lead
      if (!leadSurrogate) {
        // no lead yet
        if (codePoint > 0xDBFF) {
          // unexpected trail
          if ((units -= 3) > -1) bytes.push(0xEF, 0xBF, 0xBD);
          continue
        } else if (i + 1 === length) {
          // unpaired lead
          if ((units -= 3) > -1) bytes.push(0xEF, 0xBF, 0xBD);
          continue
        }

        // valid lead
        leadSurrogate = codePoint;

        continue
      }

      // 2 leads in a row
      if (codePoint < 0xDC00) {
        if ((units -= 3) > -1) bytes.push(0xEF, 0xBF, 0xBD);
        leadSurrogate = codePoint;
        continue
      }

      // valid surrogate pair
      codePoint = (leadSurrogate - 0xD800 << 10 | codePoint - 0xDC00) + 0x10000;
    } else if (leadSurrogate) {
      // valid bmp char, but last char was a lead
      if ((units -= 3) > -1) bytes.push(0xEF, 0xBF, 0xBD);
    }

    leadSurrogate = null;

    // encode utf8
    if (codePoint < 0x80) {
      if ((units -= 1) < 0) break
      bytes.push(codePoint);
    } else if (codePoint < 0x800) {
      if ((units -= 2) < 0) break
      bytes.push(
        codePoint >> 0x6 | 0xC0,
        codePoint & 0x3F | 0x80
      );
    } else if (codePoint < 0x10000) {
      if ((units -= 3) < 0) break
      bytes.push(
        codePoint >> 0xC | 0xE0,
        codePoint >> 0x6 & 0x3F | 0x80,
        codePoint & 0x3F | 0x80
      );
    } else if (codePoint < 0x110000) {
      if ((units -= 4) < 0) break
      bytes.push(
        codePoint >> 0x12 | 0xF0,
        codePoint >> 0xC & 0x3F | 0x80,
        codePoint >> 0x6 & 0x3F | 0x80,
        codePoint & 0x3F | 0x80
      );
    } else {
      throw new Error('Invalid code point')
    }
  }

  return bytes
}

function asciiToBytes (str) {
  var byteArray = [];
  for (var i = 0; i < str.length; ++i) {
    // Node's code seems to be doing this and not & 0x7F..
    byteArray.push(str.charCodeAt(i) & 0xFF);
  }
  return byteArray
}

function utf16leToBytes (str, units) {
  var c, hi, lo;
  var byteArray = [];
  for (var i = 0; i < str.length; ++i) {
    if ((units -= 2) < 0) break

    c = str.charCodeAt(i);
    hi = c >> 8;
    lo = c % 256;
    byteArray.push(lo);
    byteArray.push(hi);
  }

  return byteArray
}


function base64ToBytes (str) {
  return toByteArray(base64clean(str))
}

function blitBuffer (src, dst, offset, length) {
  for (var i = 0; i < length; ++i) {
    if ((i + offset >= dst.length) || (i >= src.length)) break
    dst[i + offset] = src[i];
  }
  return i
}

function isnan (val) {
  return val !== val // eslint-disable-line no-self-compare
}


// the following is from is-buffer, also by Feross Aboukhadijeh and with same lisence
// The _isBuffer check is for Safari 5-7 support, because it's missing
// Object.prototype.constructor. Remove this eventually
function isBuffer(obj) {
  return obj != null && (!!obj._isBuffer || isFastBuffer(obj) || isSlowBuffer(obj))
}

function isFastBuffer (obj) {
  return !!obj.constructor && typeof obj.constructor.isBuffer === 'function' && obj.constructor.isBuffer(obj)
}

// For Node v0.10 support. Remove this eventually.
function isSlowBuffer (obj) {
  return typeof obj.readFloatLE === 'function' && typeof obj.slice === 'function' && isFastBuffer(obj.slice(0, 0))
}

var bufferEs6 = /*#__PURE__*/Object.freeze({
	INSPECT_MAX_BYTES: INSPECT_MAX_BYTES,
	kMaxLength: _kMaxLength,
	Buffer: Buffer,
	SlowBuffer: SlowBuffer,
	isBuffer: isBuffer
});

/**
 * Bit twiddling hacks for JavaScript.
 *
 * Author: Mikola Lysenko
 *
 * Ported from Stanford bit twiddling hack library:
 *    http://graphics.stanford.edu/~seander/bithacks.html
 */

//Number of bits in an integer
var INT_BITS = 32;

//Constants
var INT_BITS_1  = INT_BITS;
var INT_MAX   =  0x7fffffff;
var INT_MIN   = -1<<(INT_BITS-1);

//Returns -1, 0, +1 depending on sign of x
var sign = function(v) {
  return (v > 0) - (v < 0);
};

//Computes absolute value of integer
var abs = function(v) {
  var mask = v >> (INT_BITS-1);
  return (v ^ mask) - mask;
};

//Computes minimum of integers x and y
var min = function(x, y) {
  return y ^ ((x ^ y) & -(x < y));
};

//Computes maximum of integers x and y
var max = function(x, y) {
  return x ^ ((x ^ y) & -(x < y));
};

//Checks if a number is a power of two
var isPow2 = function(v) {
  return !(v & (v-1)) && (!!v);
};

//Computes log base 2 of v
var log2 = function(v) {
  var r, shift;
  r =     (v > 0xFFFF) << 4; v >>>= r;
  shift = (v > 0xFF  ) << 3; v >>>= shift; r |= shift;
  shift = (v > 0xF   ) << 2; v >>>= shift; r |= shift;
  shift = (v > 0x3   ) << 1; v >>>= shift; r |= shift;
  return r | (v >> 1);
};

//Computes log base 10 of v
var log10 = function(v) {
  return  (v >= 1000000000) ? 9 : (v >= 100000000) ? 8 : (v >= 10000000) ? 7 :
          (v >= 1000000) ? 6 : (v >= 100000) ? 5 : (v >= 10000) ? 4 :
          (v >= 1000) ? 3 : (v >= 100) ? 2 : (v >= 10) ? 1 : 0;
};

//Counts number of bits
var popCount = function(v) {
  v = v - ((v >>> 1) & 0x55555555);
  v = (v & 0x33333333) + ((v >>> 2) & 0x33333333);
  return ((v + (v >>> 4) & 0xF0F0F0F) * 0x1010101) >>> 24;
};

//Counts number of trailing zeros
function countTrailingZeros(v) {
  var c = 32;
  v &= -v;
  if (v) c--;
  if (v & 0x0000FFFF) c -= 16;
  if (v & 0x00FF00FF) c -= 8;
  if (v & 0x0F0F0F0F) c -= 4;
  if (v & 0x33333333) c -= 2;
  if (v & 0x55555555) c -= 1;
  return c;
}
var countTrailingZeros_1 = countTrailingZeros;

//Rounds to next power of 2
var nextPow2 = function(v) {
  v += v === 0;
  --v;
  v |= v >>> 1;
  v |= v >>> 2;
  v |= v >>> 4;
  v |= v >>> 8;
  v |= v >>> 16;
  return v + 1;
};

//Rounds down to previous power of 2
var prevPow2 = function(v) {
  v |= v >>> 1;
  v |= v >>> 2;
  v |= v >>> 4;
  v |= v >>> 8;
  v |= v >>> 16;
  return v - (v>>>1);
};

//Computes parity of word
var parity = function(v) {
  v ^= v >>> 16;
  v ^= v >>> 8;
  v ^= v >>> 4;
  v &= 0xf;
  return (0x6996 >>> v) & 1;
};

var REVERSE_TABLE = new Array(256);

(function(tab) {
  for(var i=0; i<256; ++i) {
    var v = i, r = i, s = 7;
    for (v >>>= 1; v; v >>>= 1) {
      r <<= 1;
      r |= v & 1;
      --s;
    }
    tab[i] = (r << s) & 0xff;
  }
})(REVERSE_TABLE);

//Reverse bits in a 32 bit word
var reverse = function(v) {
  return  (REVERSE_TABLE[ v         & 0xff] << 24) |
          (REVERSE_TABLE[(v >>> 8)  & 0xff] << 16) |
          (REVERSE_TABLE[(v >>> 16) & 0xff] << 8)  |
           REVERSE_TABLE[(v >>> 24) & 0xff];
};

//Interleave bits of 2 coordinates with 16 bits.  Useful for fast quadtree codes
var interleave2 = function(x, y) {
  x &= 0xFFFF;
  x = (x | (x << 8)) & 0x00FF00FF;
  x = (x | (x << 4)) & 0x0F0F0F0F;
  x = (x | (x << 2)) & 0x33333333;
  x = (x | (x << 1)) & 0x55555555;

  y &= 0xFFFF;
  y = (y | (y << 8)) & 0x00FF00FF;
  y = (y | (y << 4)) & 0x0F0F0F0F;
  y = (y | (y << 2)) & 0x33333333;
  y = (y | (y << 1)) & 0x55555555;

  return x | (y << 1);
};

//Extracts the nth interleaved component
var deinterleave2 = function(v, n) {
  v = (v >>> n) & 0x55555555;
  v = (v | (v >>> 1))  & 0x33333333;
  v = (v | (v >>> 2))  & 0x0F0F0F0F;
  v = (v | (v >>> 4))  & 0x00FF00FF;
  v = (v | (v >>> 16)) & 0x000FFFF;
  return (v << 16) >> 16;
};


//Interleave bits of 3 coordinates, each with 10 bits.  Useful for fast octree codes
var interleave3 = function(x, y, z) {
  x &= 0x3FF;
  x  = (x | (x<<16)) & 4278190335;
  x  = (x | (x<<8))  & 251719695;
  x  = (x | (x<<4))  & 3272356035;
  x  = (x | (x<<2))  & 1227133513;

  y &= 0x3FF;
  y  = (y | (y<<16)) & 4278190335;
  y  = (y | (y<<8))  & 251719695;
  y  = (y | (y<<4))  & 3272356035;
  y  = (y | (y<<2))  & 1227133513;
  x |= (y << 1);
  
  z &= 0x3FF;
  z  = (z | (z<<16)) & 4278190335;
  z  = (z | (z<<8))  & 251719695;
  z  = (z | (z<<4))  & 3272356035;
  z  = (z | (z<<2))  & 1227133513;
  
  return x | (z << 2);
};

//Extracts nth interleaved component of a 3-tuple
var deinterleave3 = function(v, n) {
  v = (v >>> n)       & 1227133513;
  v = (v | (v>>>2))   & 3272356035;
  v = (v | (v>>>4))   & 251719695;
  v = (v | (v>>>8))   & 4278190335;
  v = (v | (v>>>16))  & 0x3FF;
  return (v<<22)>>22;
};

//Computes next combination in colexicographic order (this is mistakenly called nextPermutation on the bit twiddling hacks page)
var nextCombination = function(v) {
  var t = v | (v - 1);
  return (t + 1) | (((~t & -~t) - 1) >>> (countTrailingZeros(v) + 1));
};

var twiddle = {
	INT_BITS: INT_BITS_1,
	INT_MAX: INT_MAX,
	INT_MIN: INT_MIN,
	sign: sign,
	abs: abs,
	min: min,
	max: max,
	isPow2: isPow2,
	log2: log2,
	log10: log10,
	popCount: popCount,
	countTrailingZeros: countTrailingZeros_1,
	nextPow2: nextPow2,
	prevPow2: prevPow2,
	parity: parity,
	reverse: reverse,
	interleave2: interleave2,
	deinterleave2: deinterleave2,
	interleave3: interleave3,
	deinterleave3: deinterleave3,
	nextCombination: nextCombination
};

function dupe_array(count, value, i) {
  var c = count[i]|0;
  if(c <= 0) {
    return []
  }
  var result = new Array(c), j;
  if(i === count.length-1) {
    for(j=0; j<c; ++j) {
      result[j] = value;
    }
  } else {
    for(j=0; j<c; ++j) {
      result[j] = dupe_array(count, value, i+1);
    }
  }
  return result
}

function dupe_number(count, value) {
  var result, i;
  result = new Array(count);
  for(i=0; i<count; ++i) {
    result[i] = value;
  }
  return result
}

function dupe(count, value) {
  if(typeof value === "undefined") {
    value = 0;
  }
  switch(typeof count) {
    case "number":
      if(count > 0) {
        return dupe_number(count|0, value)
      }
    break
    case "object":
      if(typeof (count.length) === "number") {
        return dupe_array(count, value, 0)
      }
    break
  }
  return []
}

var dup = dupe;

var pool = createCommonjsModule(function (module, exports) {




//Legacy pool support
if(!commonjsGlobal.__TYPEDARRAY_POOL) {
  commonjsGlobal.__TYPEDARRAY_POOL = {
      UINT8   : dup([32, 0])
    , UINT16  : dup([32, 0])
    , UINT32  : dup([32, 0])
    , INT8    : dup([32, 0])
    , INT16   : dup([32, 0])
    , INT32   : dup([32, 0])
    , FLOAT   : dup([32, 0])
    , DOUBLE  : dup([32, 0])
    , DATA    : dup([32, 0])
    , UINT8C  : dup([32, 0])
    , BUFFER  : dup([32, 0])
  };
}

var hasUint8C = (typeof Uint8ClampedArray) !== 'undefined';
var POOL = commonjsGlobal.__TYPEDARRAY_POOL;

//Upgrade pool
if(!POOL.UINT8C) {
  POOL.UINT8C = dup([32, 0]);
}
if(!POOL.BUFFER) {
  POOL.BUFFER = dup([32, 0]);
}

//New technique: Only allocate from ArrayBufferView and Buffer
var DATA    = POOL.DATA
  , BUFFER  = POOL.BUFFER;

exports.free = function free(array) {
  if(isBuffer(array)) {
    BUFFER[twiddle.log2(array.length)].push(array);
  } else {
    if(Object.prototype.toString.call(array) !== '[object ArrayBuffer]') {
      array = array.buffer;
    }
    if(!array) {
      return
    }
    var n = array.length || array.byteLength;
    var log_n = twiddle.log2(n)|0;
    DATA[log_n].push(array);
  }
};

function freeArrayBuffer(buffer) {
  if(!buffer) {
    return
  }
  var n = buffer.length || buffer.byteLength;
  var log_n = twiddle.log2(n);
  DATA[log_n].push(buffer);
}

function freeTypedArray(array) {
  freeArrayBuffer(array.buffer);
}

exports.freeUint8 =
exports.freeUint16 =
exports.freeUint32 =
exports.freeInt8 =
exports.freeInt16 =
exports.freeInt32 =
exports.freeFloat32 = 
exports.freeFloat =
exports.freeFloat64 = 
exports.freeDouble = 
exports.freeUint8Clamped = 
exports.freeDataView = freeTypedArray;

exports.freeArrayBuffer = freeArrayBuffer;

exports.freeBuffer = function freeBuffer(array) {
  BUFFER[twiddle.log2(array.length)].push(array);
};

exports.malloc = function malloc(n, dtype) {
  if(dtype === undefined || dtype === 'arraybuffer') {
    return mallocArrayBuffer(n)
  } else {
    switch(dtype) {
      case 'uint8':
        return mallocUint8(n)
      case 'uint16':
        return mallocUint16(n)
      case 'uint32':
        return mallocUint32(n)
      case 'int8':
        return mallocInt8(n)
      case 'int16':
        return mallocInt16(n)
      case 'int32':
        return mallocInt32(n)
      case 'float':
      case 'float32':
        return mallocFloat(n)
      case 'double':
      case 'float64':
        return mallocDouble(n)
      case 'uint8_clamped':
        return mallocUint8Clamped(n)
      case 'buffer':
        return mallocBuffer(n)
      case 'data':
      case 'dataview':
        return mallocDataView(n)

      default:
        return null
    }
  }
  return null
};

function mallocArrayBuffer(n) {
  var n = twiddle.nextPow2(n);
  var log_n = twiddle.log2(n);
  var d = DATA[log_n];
  if(d.length > 0) {
    return d.pop()
  }
  return new ArrayBuffer(n)
}
exports.mallocArrayBuffer = mallocArrayBuffer;

function mallocUint8(n) {
  return new Uint8Array(mallocArrayBuffer(n), 0, n)
}
exports.mallocUint8 = mallocUint8;

function mallocUint16(n) {
  return new Uint16Array(mallocArrayBuffer(2*n), 0, n)
}
exports.mallocUint16 = mallocUint16;

function mallocUint32(n) {
  return new Uint32Array(mallocArrayBuffer(4*n), 0, n)
}
exports.mallocUint32 = mallocUint32;

function mallocInt8(n) {
  return new Int8Array(mallocArrayBuffer(n), 0, n)
}
exports.mallocInt8 = mallocInt8;

function mallocInt16(n) {
  return new Int16Array(mallocArrayBuffer(2*n), 0, n)
}
exports.mallocInt16 = mallocInt16;

function mallocInt32(n) {
  return new Int32Array(mallocArrayBuffer(4*n), 0, n)
}
exports.mallocInt32 = mallocInt32;

function mallocFloat(n) {
  return new Float32Array(mallocArrayBuffer(4*n), 0, n)
}
exports.mallocFloat32 = exports.mallocFloat = mallocFloat;

function mallocDouble(n) {
  return new Float64Array(mallocArrayBuffer(8*n), 0, n)
}
exports.mallocFloat64 = exports.mallocDouble = mallocDouble;

function mallocUint8Clamped(n) {
  if(hasUint8C) {
    return new Uint8ClampedArray(mallocArrayBuffer(n), 0, n)
  } else {
    return mallocUint8(n)
  }
}
exports.mallocUint8Clamped = mallocUint8Clamped;

function mallocDataView(n) {
  return new DataView(mallocArrayBuffer(n), 0, n)
}
exports.mallocDataView = mallocDataView;

function mallocBuffer(n) {
  n = twiddle.nextPow2(n);
  var log_n = twiddle.log2(n);
  var cache = BUFFER[log_n];
  if(cache.length > 0) {
    return cache.pop()
  }
  return new Buffer(n)
}
exports.mallocBuffer = mallocBuffer;

exports.clearCache = function clearCache() {
  for(var i=0; i<32; ++i) {
    POOL.UINT8[i].length = 0;
    POOL.UINT16[i].length = 0;
    POOL.UINT32[i].length = 0;
    POOL.INT8[i].length = 0;
    POOL.INT16[i].length = 0;
    POOL.INT32[i].length = 0;
    POOL.FLOAT[i].length = 0;
    POOL.DOUBLE[i].length = 0;
    POOL.UINT8C[i].length = 0;
    DATA[i].length = 0;
    BUFFER[i].length = 0;
  }
};
});
var pool_1 = pool.free;
var pool_2 = pool.freeUint8;
var pool_3 = pool.freeUint16;
var pool_4 = pool.freeUint32;
var pool_5 = pool.freeInt8;
var pool_6 = pool.freeInt16;
var pool_7 = pool.freeInt32;
var pool_8 = pool.freeFloat32;
var pool_9 = pool.freeFloat;
var pool_10 = pool.freeFloat64;
var pool_11 = pool.freeDouble;
var pool_12 = pool.freeUint8Clamped;
var pool_13 = pool.freeDataView;
var pool_14 = pool.freeArrayBuffer;
var pool_15 = pool.freeBuffer;
var pool_16 = pool.malloc;
var pool_17 = pool.mallocArrayBuffer;
var pool_18 = pool.mallocUint8;
var pool_19 = pool.mallocUint16;
var pool_20 = pool.mallocUint32;
var pool_21 = pool.mallocInt8;
var pool_22 = pool.mallocInt16;
var pool_23 = pool.mallocInt32;
var pool_24 = pool.mallocFloat32;
var pool_25 = pool.mallocFloat;
var pool_26 = pool.mallocFloat64;
var pool_27 = pool.mallocDouble;
var pool_28 = pool.mallocUint8Clamped;
var pool_29 = pool.mallocDataView;
var pool_30 = pool.mallocBuffer;
var pool_31 = pool.clearCache;

//This code is extracted from ndarray-sort
//It is inlined here as a temporary workaround

var sort = wrapper;

var INSERT_SORT_CUTOFF = 32;

function wrapper(data, n0) {
  if (n0 <= 4*INSERT_SORT_CUTOFF) {
    insertionSort(0, n0 - 1, data);
  } else {
    quickSort(0, n0 - 1, data);
  }
}

function insertionSort(left, right, data) {
  var ptr = 2*(left+1);
  for(var i=left+1; i<=right; ++i) {
    var a = data[ptr++];
    var b = data[ptr++];
    var j = i;
    var jptr = ptr-2;
    while(j-- > left) {
      var x = data[jptr-2];
      var y = data[jptr-1];
      if(x < a) {
        break
      } else if(x === a && y < b) {
        break
      }
      data[jptr]   = x;
      data[jptr+1] = y;
      jptr -= 2;
    }
    data[jptr]   = a;
    data[jptr+1] = b;
  }
}

function swap$2(i, j, data) {
  i *= 2;
  j *= 2;
  var x = data[i];
  var y = data[i+1];
  data[i] = data[j];
  data[i+1] = data[j+1];
  data[j] = x;
  data[j+1] = y;
}

function move(i, j, data) {
  i *= 2;
  j *= 2;
  data[i] = data[j];
  data[i+1] = data[j+1];
}

function rotate(i, j, k, data) {
  i *= 2;
  j *= 2;
  k *= 2;
  var x = data[i];
  var y = data[i+1];
  data[i] = data[j];
  data[i+1] = data[j+1];
  data[j] = data[k];
  data[j+1] = data[k+1];
  data[k] = x;
  data[k+1] = y;
}

function shufflePivot(i, j, px, py, data) {
  i *= 2;
  j *= 2;
  data[i] = data[j];
  data[j] = px;
  data[i+1] = data[j+1];
  data[j+1] = py;
}

function compare$2(i, j, data) {
  i *= 2;
  j *= 2;
  var x = data[i],
      y = data[j];
  if(x < y) {
    return false
  } else if(x === y) {
    return data[i+1] > data[j+1]
  }
  return true
}

function comparePivot(i, y, b, data) {
  i *= 2;
  var x = data[i];
  if(x < y) {
    return true
  } else if(x === y) {
    return data[i+1] < b
  }
  return false
}

function quickSort(left, right, data) {
  var sixth = (right - left + 1) / 6 | 0, 
      index1 = left + sixth, 
      index5 = right - sixth, 
      index3 = left + right >> 1, 
      index2 = index3 - sixth, 
      index4 = index3 + sixth, 
      el1 = index1, 
      el2 = index2, 
      el3 = index3, 
      el4 = index4, 
      el5 = index5, 
      less = left + 1, 
      great = right - 1, 
      tmp = 0;
  if(compare$2(el1, el2, data)) {
    tmp = el1;
    el1 = el2;
    el2 = tmp;
  }
  if(compare$2(el4, el5, data)) {
    tmp = el4;
    el4 = el5;
    el5 = tmp;
  }
  if(compare$2(el1, el3, data)) {
    tmp = el1;
    el1 = el3;
    el3 = tmp;
  }
  if(compare$2(el2, el3, data)) {
    tmp = el2;
    el2 = el3;
    el3 = tmp;
  }
  if(compare$2(el1, el4, data)) {
    tmp = el1;
    el1 = el4;
    el4 = tmp;
  }
  if(compare$2(el3, el4, data)) {
    tmp = el3;
    el3 = el4;
    el4 = tmp;
  }
  if(compare$2(el2, el5, data)) {
    tmp = el2;
    el2 = el5;
    el5 = tmp;
  }
  if(compare$2(el2, el3, data)) {
    tmp = el2;
    el2 = el3;
    el3 = tmp;
  }
  if(compare$2(el4, el5, data)) {
    tmp = el4;
    el4 = el5;
    el5 = tmp;
  }

  var pivot1X = data[2*el2];
  var pivot1Y = data[2*el2+1];
  var pivot2X = data[2*el4];
  var pivot2Y = data[2*el4+1];

  var ptr0 = 2 * el1;
  var ptr2 = 2 * el3;
  var ptr4 = 2 * el5;
  var ptr5 = 2 * index1;
  var ptr6 = 2 * index3;
  var ptr7 = 2 * index5;
  for (var i1 = 0; i1 < 2; ++i1) {
    var x = data[ptr0+i1];
    var y = data[ptr2+i1];
    var z = data[ptr4+i1];
    data[ptr5+i1] = x;
    data[ptr6+i1] = y;
    data[ptr7+i1] = z;
  }

  move(index2, left, data);
  move(index4, right, data);
  for (var k = less; k <= great; ++k) {
    if (comparePivot(k, pivot1X, pivot1Y, data)) {
      if (k !== less) {
        swap$2(k, less, data);
      }
      ++less;
    } else {
      if (!comparePivot(k, pivot2X, pivot2Y, data)) {
        while (true) {
          if (!comparePivot(great, pivot2X, pivot2Y, data)) {
            if (--great < k) {
              break;
            }
            continue;
          } else {
            if (comparePivot(great, pivot1X, pivot1Y, data)) {
              rotate(k, less, great, data);
              ++less;
              --great;
            } else {
              swap$2(k, great, data);
              --great;
            }
            break;
          }
        }
      }
    }
  }
  shufflePivot(left, less-1, pivot1X, pivot1Y, data);
  shufflePivot(right, great+1, pivot2X, pivot2Y, data);
  if (less - 2 - left <= INSERT_SORT_CUTOFF) {
    insertionSort(left, less - 2, data);
  } else {
    quickSort(left, less - 2, data);
  }
  if (right - (great + 2) <= INSERT_SORT_CUTOFF) {
    insertionSort(great + 2, right, data);
  } else {
    quickSort(great + 2, right, data);
  }
  if (great - less <= INSERT_SORT_CUTOFF) {
    insertionSort(less, great, data);
  } else {
    quickSort(less, great, data);
  }
}

var sweep = {
  init:           sqInit,
  sweepBipartite: sweepBipartite,
  sweepComplete:  sweepComplete,
  scanBipartite:  scanBipartite,
  scanComplete:   scanComplete
};





//Flag for blue
var BLUE_FLAG = (1<<28);

//1D sweep event queue stuff (use pool to save space)
var INIT_CAPACITY      = 1024;
var RED_SWEEP_QUEUE    = pool.mallocInt32(INIT_CAPACITY);
var RED_SWEEP_INDEX    = pool.mallocInt32(INIT_CAPACITY);
var BLUE_SWEEP_QUEUE   = pool.mallocInt32(INIT_CAPACITY);
var BLUE_SWEEP_INDEX   = pool.mallocInt32(INIT_CAPACITY);
var COMMON_SWEEP_QUEUE = pool.mallocInt32(INIT_CAPACITY);
var COMMON_SWEEP_INDEX = pool.mallocInt32(INIT_CAPACITY);
var SWEEP_EVENTS       = pool.mallocDouble(INIT_CAPACITY * 8);

//Reserves memory for the 1D sweep data structures
function sqInit(count) {
  var rcount = twiddle.nextPow2(count);
  if(RED_SWEEP_QUEUE.length < rcount) {
    pool.free(RED_SWEEP_QUEUE);
    RED_SWEEP_QUEUE = pool.mallocInt32(rcount);
  }
  if(RED_SWEEP_INDEX.length < rcount) {
    pool.free(RED_SWEEP_INDEX);
    RED_SWEEP_INDEX = pool.mallocInt32(rcount);
  }
  if(BLUE_SWEEP_QUEUE.length < rcount) {
    pool.free(BLUE_SWEEP_QUEUE);
    BLUE_SWEEP_QUEUE = pool.mallocInt32(rcount);
  }
  if(BLUE_SWEEP_INDEX.length < rcount) {
    pool.free(BLUE_SWEEP_INDEX);
    BLUE_SWEEP_INDEX = pool.mallocInt32(rcount);
  }
  if(COMMON_SWEEP_QUEUE.length < rcount) {
    pool.free(COMMON_SWEEP_QUEUE);
    COMMON_SWEEP_QUEUE = pool.mallocInt32(rcount);
  }
  if(COMMON_SWEEP_INDEX.length < rcount) {
    pool.free(COMMON_SWEEP_INDEX);
    COMMON_SWEEP_INDEX = pool.mallocInt32(rcount);
  }
  var eventLength = 8 * rcount;
  if(SWEEP_EVENTS.length < eventLength) {
    pool.free(SWEEP_EVENTS);
    SWEEP_EVENTS = pool.mallocDouble(eventLength);
  }
}

//Remove an item from the active queue in O(1)
function sqPop(queue, index, count, item) {
  var idx = index[item];
  var top = queue[count-1];
  queue[idx] = top;
  index[top] = idx;
}

//Insert an item into the active queue in O(1)
function sqPush(queue, index, count, item) {
  queue[count] = item;
  index[item]  = count;
}

//Recursion base case: use 1D sweep algorithm
function sweepBipartite(
    d, visit,
    redStart,  redEnd, red, redIndex,
    blueStart, blueEnd, blue, blueIndex) {

  //store events as pairs [coordinate, idx]
  //
  //  red create:  -(idx+1)
  //  red destroy: idx
  //  blue create: -(idx+BLUE_FLAG)
  //  blue destroy: idx+BLUE_FLAG
  //
  var ptr      = 0;
  var elemSize = 2*d;
  var istart   = d-1;
  var iend     = elemSize-1;

  for(var i=redStart; i<redEnd; ++i) {
    var idx = redIndex[i];
    var redOffset = elemSize*i;
    SWEEP_EVENTS[ptr++] = red[redOffset+istart];
    SWEEP_EVENTS[ptr++] = -(idx+1);
    SWEEP_EVENTS[ptr++] = red[redOffset+iend];
    SWEEP_EVENTS[ptr++] = idx;
  }

  for(var i=blueStart; i<blueEnd; ++i) {
    var idx = blueIndex[i]+BLUE_FLAG;
    var blueOffset = elemSize*i;
    SWEEP_EVENTS[ptr++] = blue[blueOffset+istart];
    SWEEP_EVENTS[ptr++] = -idx;
    SWEEP_EVENTS[ptr++] = blue[blueOffset+iend];
    SWEEP_EVENTS[ptr++] = idx;
  }

  //process events from left->right
  var n = ptr >>> 1;
  sort(SWEEP_EVENTS, n);
  
  var redActive  = 0;
  var blueActive = 0;
  for(var i=0; i<n; ++i) {
    var e = SWEEP_EVENTS[2*i+1]|0;
    if(e >= BLUE_FLAG) {
      //blue destroy event
      e = (e-BLUE_FLAG)|0;
      sqPop(BLUE_SWEEP_QUEUE, BLUE_SWEEP_INDEX, blueActive--, e);
    } else if(e >= 0) {
      //red destroy event
      sqPop(RED_SWEEP_QUEUE, RED_SWEEP_INDEX, redActive--, e);
    } else if(e <= -BLUE_FLAG) {
      //blue create event
      e = (-e-BLUE_FLAG)|0;
      for(var j=0; j<redActive; ++j) {
        var retval = visit(RED_SWEEP_QUEUE[j], e);
        if(retval !== void 0) {
          return retval
        }
      }
      sqPush(BLUE_SWEEP_QUEUE, BLUE_SWEEP_INDEX, blueActive++, e);
    } else {
      //red create event
      e = (-e-1)|0;
      for(var j=0; j<blueActive; ++j) {
        var retval = visit(e, BLUE_SWEEP_QUEUE[j]);
        if(retval !== void 0) {
          return retval
        }
      }
      sqPush(RED_SWEEP_QUEUE, RED_SWEEP_INDEX, redActive++, e);
    }
  }
}

//Complete sweep
function sweepComplete(d, visit, 
  redStart, redEnd, red, redIndex,
  blueStart, blueEnd, blue, blueIndex) {

  var ptr      = 0;
  var elemSize = 2*d;
  var istart   = d-1;
  var iend     = elemSize-1;

  for(var i=redStart; i<redEnd; ++i) {
    var idx = (redIndex[i]+1)<<1;
    var redOffset = elemSize*i;
    SWEEP_EVENTS[ptr++] = red[redOffset+istart];
    SWEEP_EVENTS[ptr++] = -idx;
    SWEEP_EVENTS[ptr++] = red[redOffset+iend];
    SWEEP_EVENTS[ptr++] = idx;
  }

  for(var i=blueStart; i<blueEnd; ++i) {
    var idx = (blueIndex[i]+1)<<1;
    var blueOffset = elemSize*i;
    SWEEP_EVENTS[ptr++] = blue[blueOffset+istart];
    SWEEP_EVENTS[ptr++] = (-idx)|1;
    SWEEP_EVENTS[ptr++] = blue[blueOffset+iend];
    SWEEP_EVENTS[ptr++] = idx|1;
  }

  //process events from left->right
  var n = ptr >>> 1;
  sort(SWEEP_EVENTS, n);
  
  var redActive    = 0;
  var blueActive   = 0;
  var commonActive = 0;
  for(var i=0; i<n; ++i) {
    var e     = SWEEP_EVENTS[2*i+1]|0;
    var color = e&1;
    if(i < n-1 && (e>>1) === (SWEEP_EVENTS[2*i+3]>>1)) {
      color = 2;
      i += 1;
    }
    
    if(e < 0) {
      //Create event
      var id = -(e>>1) - 1;

      //Intersect with common
      for(var j=0; j<commonActive; ++j) {
        var retval = visit(COMMON_SWEEP_QUEUE[j], id);
        if(retval !== void 0) {
          return retval
        }
      }

      if(color !== 0) {
        //Intersect with red
        for(var j=0; j<redActive; ++j) {
          var retval = visit(RED_SWEEP_QUEUE[j], id);
          if(retval !== void 0) {
            return retval
          }
        }
      }

      if(color !== 1) {
        //Intersect with blue
        for(var j=0; j<blueActive; ++j) {
          var retval = visit(BLUE_SWEEP_QUEUE[j], id);
          if(retval !== void 0) {
            return retval
          }
        }
      }

      if(color === 0) {
        //Red
        sqPush(RED_SWEEP_QUEUE, RED_SWEEP_INDEX, redActive++, id);
      } else if(color === 1) {
        //Blue
        sqPush(BLUE_SWEEP_QUEUE, BLUE_SWEEP_INDEX, blueActive++, id);
      } else if(color === 2) {
        //Both
        sqPush(COMMON_SWEEP_QUEUE, COMMON_SWEEP_INDEX, commonActive++, id);
      }
    } else {
      //Destroy event
      var id = (e>>1) - 1;
      if(color === 0) {
        //Red
        sqPop(RED_SWEEP_QUEUE, RED_SWEEP_INDEX, redActive--, id);
      } else if(color === 1) {
        //Blue
        sqPop(BLUE_SWEEP_QUEUE, BLUE_SWEEP_INDEX, blueActive--, id);
      } else if(color === 2) {
        //Both
        sqPop(COMMON_SWEEP_QUEUE, COMMON_SWEEP_INDEX, commonActive--, id);
      }
    }
  }
}

//Sweep and prune/scanline algorithm:
//  Scan along axis, detect intersections
//  Brute force all boxes along axis
function scanBipartite(
  d, axis, visit, flip,
  redStart,  redEnd, red, redIndex,
  blueStart, blueEnd, blue, blueIndex) {
  
  var ptr      = 0;
  var elemSize = 2*d;
  var istart   = axis;
  var iend     = axis+d;

  var redShift  = 1;
  var blueShift = 1;
  if(flip) {
    blueShift = BLUE_FLAG;
  } else {
    redShift  = BLUE_FLAG;
  }

  for(var i=redStart; i<redEnd; ++i) {
    var idx = i + redShift;
    var redOffset = elemSize*i;
    SWEEP_EVENTS[ptr++] = red[redOffset+istart];
    SWEEP_EVENTS[ptr++] = -idx;
    SWEEP_EVENTS[ptr++] = red[redOffset+iend];
    SWEEP_EVENTS[ptr++] = idx;
  }
  for(var i=blueStart; i<blueEnd; ++i) {
    var idx = i + blueShift;
    var blueOffset = elemSize*i;
    SWEEP_EVENTS[ptr++] = blue[blueOffset+istart];
    SWEEP_EVENTS[ptr++] = -idx;
  }

  //process events from left->right
  var n = ptr >>> 1;
  sort(SWEEP_EVENTS, n);
  
  var redActive    = 0;
  for(var i=0; i<n; ++i) {
    var e = SWEEP_EVENTS[2*i+1]|0;
    if(e < 0) {
      var idx   = -e;
      var isRed = false;
      if(idx >= BLUE_FLAG) {
        isRed = !flip;
        idx -= BLUE_FLAG; 
      } else {
        isRed = !!flip;
        idx -= 1;
      }
      if(isRed) {
        sqPush(RED_SWEEP_QUEUE, RED_SWEEP_INDEX, redActive++, idx);
      } else {
        var blueId  = blueIndex[idx];
        var bluePtr = elemSize * idx;
        
        var b0 = blue[bluePtr+axis+1];
        var b1 = blue[bluePtr+axis+1+d];

red_loop:
        for(var j=0; j<redActive; ++j) {
          var oidx   = RED_SWEEP_QUEUE[j];
          var redPtr = elemSize * oidx;

          if(b1 < red[redPtr+axis+1] || 
             red[redPtr+axis+1+d] < b0) {
            continue
          }

          for(var k=axis+2; k<d; ++k) {
            if(blue[bluePtr + k + d] < red[redPtr + k] || 
               red[redPtr + k + d] < blue[bluePtr + k]) {
              continue red_loop
            }
          }

          var redId  = redIndex[oidx];
          var retval;
          if(flip) {
            retval = visit(blueId, redId);
          } else {
            retval = visit(redId, blueId);
          }
          if(retval !== void 0) {
            return retval 
          }
        }
      }
    } else {
      sqPop(RED_SWEEP_QUEUE, RED_SWEEP_INDEX, redActive--, e - redShift);
    }
  }
}

function scanComplete(
  d, axis, visit,
  redStart,  redEnd, red, redIndex,
  blueStart, blueEnd, blue, blueIndex) {

  var ptr      = 0;
  var elemSize = 2*d;
  var istart   = axis;
  var iend     = axis+d;

  for(var i=redStart; i<redEnd; ++i) {
    var idx = i + BLUE_FLAG;
    var redOffset = elemSize*i;
    SWEEP_EVENTS[ptr++] = red[redOffset+istart];
    SWEEP_EVENTS[ptr++] = -idx;
    SWEEP_EVENTS[ptr++] = red[redOffset+iend];
    SWEEP_EVENTS[ptr++] = idx;
  }
  for(var i=blueStart; i<blueEnd; ++i) {
    var idx = i + 1;
    var blueOffset = elemSize*i;
    SWEEP_EVENTS[ptr++] = blue[blueOffset+istart];
    SWEEP_EVENTS[ptr++] = -idx;
  }

  //process events from left->right
  var n = ptr >>> 1;
  sort(SWEEP_EVENTS, n);
  
  var redActive    = 0;
  for(var i=0; i<n; ++i) {
    var e = SWEEP_EVENTS[2*i+1]|0;
    if(e < 0) {
      var idx   = -e;
      if(idx >= BLUE_FLAG) {
        RED_SWEEP_QUEUE[redActive++] = idx - BLUE_FLAG;
      } else {
        idx -= 1;
        var blueId  = blueIndex[idx];
        var bluePtr = elemSize * idx;

        var b0 = blue[bluePtr+axis+1];
        var b1 = blue[bluePtr+axis+1+d];

red_loop:
        for(var j=0; j<redActive; ++j) {
          var oidx   = RED_SWEEP_QUEUE[j];
          var redId  = redIndex[oidx];

          if(redId === blueId) {
            break
          }

          var redPtr = elemSize * oidx;
          if(b1 < red[redPtr+axis+1] || 
            red[redPtr+axis+1+d] < b0) {
            continue
          }
          for(var k=axis+2; k<d; ++k) {
            if(blue[bluePtr + k + d] < red[redPtr + k] || 
               red[redPtr + k + d]   < blue[bluePtr + k]) {
              continue red_loop
            }
          }

          var retval = visit(redId, blueId);
          if(retval !== void 0) {
            return retval 
          }
        }
      }
    } else {
      var idx = e - BLUE_FLAG;
      for(var j=redActive-1; j>=0; --j) {
        if(RED_SWEEP_QUEUE[j] === idx) {
          for(var k=j+1; k<redActive; ++k) {
            RED_SWEEP_QUEUE[k-1] = RED_SWEEP_QUEUE[k];
          }
          break
        }
      }
      --redActive;
    }
  }
}

var DIMENSION   = 'd';
var AXIS        = 'ax';
var VISIT       = 'vv';
var FLIP        = 'fp';

var ELEM_SIZE   = 'es';

var RED_START   = 'rs';
var RED_END     = 're';
var RED_BOXES   = 'rb';
var RED_INDEX   = 'ri';
var RED_PTR     = 'rp';

var BLUE_START  = 'bs';
var BLUE_END    = 'be';
var BLUE_BOXES  = 'bb';
var BLUE_INDEX  = 'bi';
var BLUE_PTR    = 'bp';

var RETVAL      = 'rv';

var INNER_LABEL = 'Q';

var ARGS = [
  DIMENSION,
  AXIS,
  VISIT,
  RED_START,
  RED_END,
  RED_BOXES,
  RED_INDEX,
  BLUE_START,
  BLUE_END,
  BLUE_BOXES,
  BLUE_INDEX
];

function generateBruteForce(redMajor, flip, full) {
  var funcName = 'bruteForce' + 
    (redMajor ? 'Red' : 'Blue') + 
    (flip ? 'Flip' : '') +
    (full ? 'Full' : '');

  var code = ['function ', funcName, '(', ARGS.join(), '){',
    'var ', ELEM_SIZE, '=2*', DIMENSION, ';'];

  var redLoop = 
    'for(var i=' + RED_START + ',' + RED_PTR + '=' + ELEM_SIZE + '*' + RED_START + ';' +
        'i<' + RED_END +';' +
        '++i,' + RED_PTR + '+=' + ELEM_SIZE + '){' +
        'var x0=' + RED_BOXES + '[' + AXIS + '+' + RED_PTR + '],' +
            'x1=' + RED_BOXES + '[' + AXIS + '+' + RED_PTR + '+' + DIMENSION + '],' +
            'xi=' + RED_INDEX + '[i];';

  var blueLoop = 
    'for(var j=' + BLUE_START + ',' + BLUE_PTR + '=' + ELEM_SIZE + '*' + BLUE_START + ';' +
        'j<' + BLUE_END + ';' +
        '++j,' + BLUE_PTR + '+=' + ELEM_SIZE + '){' +
        'var y0=' + BLUE_BOXES + '[' + AXIS + '+' + BLUE_PTR + '],' +
            (full ? 'y1=' + BLUE_BOXES + '[' + AXIS + '+' + BLUE_PTR + '+' + DIMENSION + '],' : '') +
            'yi=' + BLUE_INDEX + '[j];';

  if(redMajor) {
    code.push(redLoop, INNER_LABEL, ':', blueLoop);
  } else {
    code.push(blueLoop, INNER_LABEL, ':', redLoop);
  }

  if(full) {
    code.push('if(y1<x0||x1<y0)continue;');
  } else if(flip) {
    code.push('if(y0<=x0||x1<y0)continue;');
  } else {
    code.push('if(y0<x0||x1<y0)continue;');
  }

  code.push('for(var k='+AXIS+'+1;k<'+DIMENSION+';++k){'+
    'var r0='+RED_BOXES+'[k+'+RED_PTR+'],'+
        'r1='+RED_BOXES+'[k+'+DIMENSION+'+'+RED_PTR+'],'+
        'b0='+BLUE_BOXES+'[k+'+BLUE_PTR+'],'+
        'b1='+BLUE_BOXES+'[k+'+DIMENSION+'+'+BLUE_PTR+'];'+
      'if(r1<b0||b1<r0)continue ' + INNER_LABEL + ';}' +
      'var ' + RETVAL + '=' + VISIT + '(');

  if(flip) {
    code.push('yi,xi');
  } else {
    code.push('xi,yi');
  }

  code.push(');if(' + RETVAL + '!==void 0)return ' + RETVAL + ';}}}');

  return {
    name: funcName, 
    code: code.join('')
  }
}

function bruteForcePlanner(full) {
  var funcName = 'bruteForce' + (full ? 'Full' : 'Partial');
  var prefix = [];
  var fargs = ARGS.slice();
  if(!full) {
    fargs.splice(3, 0, FLIP);
  }

  var code = ['function ' + funcName + '(' + fargs.join() + '){'];

  function invoke(redMajor, flip) {
    var res = generateBruteForce(redMajor, flip, full);
    prefix.push(res.code);
    code.push('return ' + res.name + '(' + ARGS.join() + ');');
  }

  code.push('if(' + RED_END + '-' + RED_START + '>' +
                    BLUE_END + '-' + BLUE_START + '){');

  if(full) {
    invoke(true, false);
    code.push('}else{');
    invoke(false, false);
  } else {
    code.push('if(' + FLIP + '){');
    invoke(true, true);
    code.push('}else{');
    invoke(true, false);
    code.push('}}else{if(' + FLIP + '){');
    invoke(false, true);
    code.push('}else{');
    invoke(false, false);
    code.push('}');
  }
  code.push('}}return ' + funcName);

  var codeStr = prefix.join('') + code.join('');
  var proc = new Function(codeStr);
  return proc()
}


var partial = bruteForcePlanner(false);
var full    = bruteForcePlanner(true);

var brute = {
	partial: partial,
	full: full
};

var partition = genPartition;

var code = 'for(var j=2*a,k=j*c,l=k,m=c,n=b,o=a+b,p=c;d>p;++p,k+=j){var _;if($)if(m===p)m+=1,l+=j;else{for(var s=0;j>s;++s){var t=e[k+s];e[k+s]=e[l],e[l++]=t}var u=f[p];f[p]=f[m],f[m++]=u}}return m';

function genPartition(predicate, args) {
  var fargs ='abcdef'.split('').concat(args);
  var reads = [];
  if(predicate.indexOf('lo') >= 0) {
    reads.push('lo=e[k+n]');
  }
  if(predicate.indexOf('hi') >= 0) {
    reads.push('hi=e[k+o]');
  }
  fargs.push(
    code.replace('_', reads.join())
        .replace('$', predicate));
  return Function.apply(void 0, fargs)
}

var median = findMedian;



var partitionStartLessThan = partition('lo<p0', ['p0']);

var PARTITION_THRESHOLD = 8;   //Cut off for using insertion sort in findMedian

//Base case for median finding:  Use insertion sort
function insertionSort$1(d, axis, start, end, boxes, ids) {
  var elemSize = 2 * d;
  var boxPtr = elemSize * (start+1) + axis;
  for(var i=start+1; i<end; ++i, boxPtr+=elemSize) {
    var x = boxes[boxPtr];
    for(var j=i, ptr=elemSize*(i-1); 
        j>start && boxes[ptr+axis] > x; 
        --j, ptr-=elemSize) {
      //Swap
      var aPtr = ptr;
      var bPtr = ptr+elemSize;
      for(var k=0; k<elemSize; ++k, ++aPtr, ++bPtr) {
        var y = boxes[aPtr];
        boxes[aPtr] = boxes[bPtr];
        boxes[bPtr] = y;
      }
      var tmp = ids[j];
      ids[j] = ids[j-1];
      ids[j-1] = tmp;
    }
  }
}

//Find median using quick select algorithm
//  takes O(n) time with high probability
function findMedian(d, axis, start, end, boxes, ids) {
  if(end <= start+1) {
    return start
  }

  var lo       = start;
  var hi       = end;
  var mid      = ((end + start) >>> 1);
  var elemSize = 2*d;
  var pivot    = mid;
  var value    = boxes[elemSize*mid+axis];
  
  while(lo < hi) {
    if(hi - lo < PARTITION_THRESHOLD) {
      insertionSort$1(d, axis, lo, hi, boxes, ids);
      value = boxes[elemSize*mid+axis];
      break
    }
    
    //Select pivot using median-of-3
    var count  = hi - lo;
    var pivot0 = (Math.random()*count+lo)|0;
    var value0 = boxes[elemSize*pivot0 + axis];
    var pivot1 = (Math.random()*count+lo)|0;
    var value1 = boxes[elemSize*pivot1 + axis];
    var pivot2 = (Math.random()*count+lo)|0;
    var value2 = boxes[elemSize*pivot2 + axis];
    if(value0 <= value1) {
      if(value2 >= value1) {
        pivot = pivot1;
        value = value1;
      } else if(value0 >= value2) {
        pivot = pivot0;
        value = value0;
      } else {
        pivot = pivot2;
        value = value2;
      }
    } else {
      if(value1 >= value2) {
        pivot = pivot1;
        value = value1;
      } else if(value2 >= value0) {
        pivot = pivot0;
        value = value0;
      } else {
        pivot = pivot2;
        value = value2;
      }
    }

    //Swap pivot to end of array
    var aPtr = elemSize * (hi-1);
    var bPtr = elemSize * pivot;
    for(var i=0; i<elemSize; ++i, ++aPtr, ++bPtr) {
      var x = boxes[aPtr];
      boxes[aPtr] = boxes[bPtr];
      boxes[bPtr] = x;
    }
    var y = ids[hi-1];
    ids[hi-1] = ids[pivot];
    ids[pivot] = y;

    //Partition using pivot
    pivot = partitionStartLessThan(
      d, axis, 
      lo, hi-1, boxes, ids,
      value);

    //Swap pivot back
    var aPtr = elemSize * (hi-1);
    var bPtr = elemSize * pivot;
    for(var i=0; i<elemSize; ++i, ++aPtr, ++bPtr) {
      var x = boxes[aPtr];
      boxes[aPtr] = boxes[bPtr];
      boxes[bPtr] = x;
    }
    var y = ids[hi-1];
    ids[hi-1] = ids[pivot];
    ids[pivot] = y;

    //Swap pivot to last pivot
    if(mid < pivot) {
      hi = pivot-1;
      while(lo < hi && 
        boxes[elemSize*(hi-1)+axis] === value) {
        hi -= 1;
      }
      hi += 1;
    } else if(pivot < mid) {
      lo = pivot + 1;
      while(lo < hi &&
        boxes[elemSize*lo+axis] === value) {
        lo += 1;
      }
    } else {
      break
    }
  }

  //Make sure pivot is at start
  return partitionStartLessThan(
    d, axis, 
    start, mid, boxes, ids,
    boxes[elemSize*mid+axis])
}

var intersect = boxIntersectIter;




var bruteForcePartial = brute.partial;
var bruteForceFull = brute.full;




//Twiddle parameters
var BRUTE_FORCE_CUTOFF    = 128;       //Cut off for brute force search
var SCAN_CUTOFF           = (1<<22);   //Cut off for two way scan
var SCAN_COMPLETE_CUTOFF  = (1<<22);  

//Partition functions
var partitionInteriorContainsInterval = partition(
  '!(lo>=p0)&&!(p1>=hi)', 
  ['p0', 'p1']);

var partitionStartEqual = partition(
  'lo===p0',
  ['p0']);

var partitionStartLessThan$1 = partition(
  'lo<p0',
  ['p0']);

var partitionEndLessThanEqual = partition(
  'hi<=p0',
  ['p0']);

var partitionContainsPoint = partition(
  'lo<=p0&&p0<=hi',
  ['p0']);

var partitionContainsPointProper = partition(
  'lo<p0&&p0<=hi',
  ['p0']);

//Frame size for iterative loop
var IFRAME_SIZE = 6;
var DFRAME_SIZE = 2;

//Data for box statck
var INIT_CAPACITY$1 = 1024;
var BOX_ISTACK  = pool.mallocInt32(INIT_CAPACITY$1);
var BOX_DSTACK  = pool.mallocDouble(INIT_CAPACITY$1);

//Initialize iterative loop queue
function iterInit(d, count) {
  var levels = (8 * twiddle.log2(count+1) * (d+1))|0;
  var maxInts = twiddle.nextPow2(IFRAME_SIZE*levels);
  if(BOX_ISTACK.length < maxInts) {
    pool.free(BOX_ISTACK);
    BOX_ISTACK = pool.mallocInt32(maxInts);
  }
  var maxDoubles = twiddle.nextPow2(DFRAME_SIZE*levels);
  if(BOX_DSTACK.length < maxDoubles) {
    pool.free(BOX_DSTACK);
    BOX_DSTACK = pool.mallocDouble(maxDoubles);
  }
}

//Append item to queue
function iterPush(ptr,
  axis, 
  redStart, redEnd, 
  blueStart, blueEnd, 
  state, 
  lo, hi) {

  var iptr = IFRAME_SIZE * ptr;
  BOX_ISTACK[iptr]   = axis;
  BOX_ISTACK[iptr+1] = redStart;
  BOX_ISTACK[iptr+2] = redEnd;
  BOX_ISTACK[iptr+3] = blueStart;
  BOX_ISTACK[iptr+4] = blueEnd;
  BOX_ISTACK[iptr+5] = state;

  var dptr = DFRAME_SIZE * ptr;
  BOX_DSTACK[dptr]   = lo;
  BOX_DSTACK[dptr+1] = hi;
}

//Special case:  Intersect single point with list of intervals
function onePointPartial(
  d, axis, visit, flip,
  redStart, redEnd, red, redIndex,
  blueOffset, blue, blueId) {

  var elemSize = 2 * d;
  var bluePtr  = blueOffset * elemSize;
  var blueX    = blue[bluePtr + axis];

red_loop:
  for(var i=redStart, redPtr=redStart*elemSize; i<redEnd; ++i, redPtr+=elemSize) {
    var r0 = red[redPtr+axis];
    var r1 = red[redPtr+axis+d];
    if(blueX < r0 || r1 < blueX) {
      continue
    }
    if(flip && blueX === r0) {
      continue
    }
    var redId = redIndex[i];
    for(var j=axis+1; j<d; ++j) {
      var r0 = red[redPtr+j];
      var r1 = red[redPtr+j+d];
      var b0 = blue[bluePtr+j];
      var b1 = blue[bluePtr+j+d];
      if(r1 < b0 || b1 < r0) {
        continue red_loop
      }
    }
    var retval;
    if(flip) {
      retval = visit(blueId, redId);
    } else {
      retval = visit(redId, blueId);
    }
    if(retval !== void 0) {
      return retval
    }
  }
}

//Special case:  Intersect one point with list of intervals
function onePointFull(
  d, axis, visit,
  redStart, redEnd, red, redIndex,
  blueOffset, blue, blueId) {

  var elemSize = 2 * d;
  var bluePtr  = blueOffset * elemSize;
  var blueX    = blue[bluePtr + axis];

red_loop:
  for(var i=redStart, redPtr=redStart*elemSize; i<redEnd; ++i, redPtr+=elemSize) {
    var redId = redIndex[i];
    if(redId === blueId) {
      continue
    }
    var r0 = red[redPtr+axis];
    var r1 = red[redPtr+axis+d];
    if(blueX < r0 || r1 < blueX) {
      continue
    }
    for(var j=axis+1; j<d; ++j) {
      var r0 = red[redPtr+j];
      var r1 = red[redPtr+j+d];
      var b0 = blue[bluePtr+j];
      var b1 = blue[bluePtr+j+d];
      if(r1 < b0 || b1 < r0) {
        continue red_loop
      }
    }
    var retval = visit(redId, blueId);
    if(retval !== void 0) {
      return retval
    }
  }
}

//The main box intersection routine
function boxIntersectIter(
  d, visit, initFull,
  xSize, xBoxes, xIndex,
  ySize, yBoxes, yIndex) {

  //Reserve memory for stack
  iterInit(d, xSize + ySize);

  var top  = 0;
  var elemSize = 2 * d;
  var retval;

  iterPush(top++,
      0,
      0, xSize,
      0, ySize,
      initFull ? 16 : 0, 
      -Infinity, Infinity);
  if(!initFull) {
    iterPush(top++,
      0,
      0, ySize,
      0, xSize,
      1, 
      -Infinity, Infinity);
  }

  while(top > 0) {
    top  -= 1;

    var iptr = top * IFRAME_SIZE;
    var axis      = BOX_ISTACK[iptr];
    var redStart  = BOX_ISTACK[iptr+1];
    var redEnd    = BOX_ISTACK[iptr+2];
    var blueStart = BOX_ISTACK[iptr+3];
    var blueEnd   = BOX_ISTACK[iptr+4];
    var state     = BOX_ISTACK[iptr+5];

    var dptr = top * DFRAME_SIZE;
    var lo        = BOX_DSTACK[dptr];
    var hi        = BOX_DSTACK[dptr+1];

    //Unpack state info
    var flip      = (state & 1);
    var full      = !!(state & 16);

    //Unpack indices
    var red       = xBoxes;
    var redIndex  = xIndex;
    var blue      = yBoxes;
    var blueIndex = yIndex;
    if(flip) {
      red         = yBoxes;
      redIndex    = yIndex;
      blue        = xBoxes;
      blueIndex   = xIndex;
    }

    if(state & 2) {
      redEnd = partitionStartLessThan$1(
        d, axis,
        redStart, redEnd, red, redIndex,
        hi);
      if(redStart >= redEnd) {
        continue
      }
    }
    if(state & 4) {
      redStart = partitionEndLessThanEqual(
        d, axis,
        redStart, redEnd, red, redIndex,
        lo);
      if(redStart >= redEnd) {
        continue
      }
    }
    
    var redCount  = redEnd  - redStart;
    var blueCount = blueEnd - blueStart;

    if(full) {
      if(d * redCount * (redCount + blueCount) < SCAN_COMPLETE_CUTOFF) {
        retval = sweep.scanComplete(
          d, axis, visit, 
          redStart, redEnd, red, redIndex,
          blueStart, blueEnd, blue, blueIndex);
        if(retval !== void 0) {
          return retval
        }
        continue
      }
    } else {
      if(d * Math.min(redCount, blueCount) < BRUTE_FORCE_CUTOFF) {
        //If input small, then use brute force
        retval = bruteForcePartial(
            d, axis, visit, flip,
            redStart,  redEnd,  red,  redIndex,
            blueStart, blueEnd, blue, blueIndex);
        if(retval !== void 0) {
          return retval
        }
        continue
      } else if(d * redCount * blueCount < SCAN_CUTOFF) {
        //If input medium sized, then use sweep and prune
        retval = sweep.scanBipartite(
          d, axis, visit, flip, 
          redStart, redEnd, red, redIndex,
          blueStart, blueEnd, blue, blueIndex);
        if(retval !== void 0) {
          return retval
        }
        continue
      }
    }
    
    //First, find all red intervals whose interior contains (lo,hi)
    var red0 = partitionInteriorContainsInterval(
      d, axis, 
      redStart, redEnd, red, redIndex,
      lo, hi);

    //Lower dimensional case
    if(redStart < red0) {

      if(d * (red0 - redStart) < BRUTE_FORCE_CUTOFF) {
        //Special case for small inputs: use brute force
        retval = bruteForceFull(
          d, axis+1, visit,
          redStart, red0, red, redIndex,
          blueStart, blueEnd, blue, blueIndex);
        if(retval !== void 0) {
          return retval
        }
      } else if(axis === d-2) {
        if(flip) {
          retval = sweep.sweepBipartite(
            d, visit,
            blueStart, blueEnd, blue, blueIndex,
            redStart, red0, red, redIndex);
        } else {
          retval = sweep.sweepBipartite(
            d, visit,
            redStart, red0, red, redIndex,
            blueStart, blueEnd, blue, blueIndex);
        }
        if(retval !== void 0) {
          return retval
        }
      } else {
        iterPush(top++,
          axis+1,
          redStart, red0,
          blueStart, blueEnd,
          flip,
          -Infinity, Infinity);
        iterPush(top++,
          axis+1,
          blueStart, blueEnd,
          redStart, red0,
          flip^1,
          -Infinity, Infinity);
      }
    }

    //Divide and conquer phase
    if(red0 < redEnd) {

      //Cut blue into 3 parts:
      //
      //  Points < mid point
      //  Points = mid point
      //  Points > mid point
      //
      var blue0 = median(
        d, axis, 
        blueStart, blueEnd, blue, blueIndex);
      var mid = blue[elemSize * blue0 + axis];
      var blue1 = partitionStartEqual(
        d, axis,
        blue0, blueEnd, blue, blueIndex,
        mid);

      //Right case
      if(blue1 < blueEnd) {
        iterPush(top++,
          axis,
          red0, redEnd,
          blue1, blueEnd,
          (flip|4) + (full ? 16 : 0),
          mid, hi);
      }

      //Left case
      if(blueStart < blue0) {
        iterPush(top++,
          axis,
          red0, redEnd,
          blueStart, blue0,
          (flip|2) + (full ? 16 : 0),
          lo, mid);
      }

      //Center case (the hard part)
      if(blue0 + 1 === blue1) {
        //Optimization: Range with exactly 1 point, use a brute force scan
        if(full) {
          retval = onePointFull(
            d, axis, visit,
            red0, redEnd, red, redIndex,
            blue0, blue, blueIndex[blue0]);
        } else {
          retval = onePointPartial(
            d, axis, visit, flip,
            red0, redEnd, red, redIndex,
            blue0, blue, blueIndex[blue0]);
        }
        if(retval !== void 0) {
          return retval
        }
      } else if(blue0 < blue1) {
        var red1;
        if(full) {
          //If full intersection, need to handle special case
          red1 = partitionContainsPoint(
            d, axis,
            red0, redEnd, red, redIndex,
            mid);
          if(red0 < red1) {
            var redX = partitionStartEqual(
              d, axis,
              red0, red1, red, redIndex,
              mid);
            if(axis === d-2) {
              //Degenerate sweep intersection:
              //  [red0, redX] with [blue0, blue1]
              if(red0 < redX) {
                retval = sweep.sweepComplete(
                  d, visit,
                  red0, redX, red, redIndex,
                  blue0, blue1, blue, blueIndex);
                if(retval !== void 0) {
                  return retval
                }
              }

              //Normal sweep intersection:
              //  [redX, red1] with [blue0, blue1]
              if(redX < red1) {
                retval = sweep.sweepBipartite(
                  d, visit,
                  redX, red1, red, redIndex,
                  blue0, blue1, blue, blueIndex);
                if(retval !== void 0) {
                  return retval
                }
              }
            } else {
              if(red0 < redX) {
                iterPush(top++,
                  axis+1,
                  red0, redX,
                  blue0, blue1,
                  16,
                  -Infinity, Infinity);
              }
              if(redX < red1) {
                iterPush(top++,
                  axis+1,
                  redX, red1,
                  blue0, blue1,
                  0,
                  -Infinity, Infinity);
                iterPush(top++,
                  axis+1,
                  blue0, blue1,
                  redX, red1,
                  1,
                  -Infinity, Infinity);
              }
            }
          }
        } else {
          if(flip) {
            red1 = partitionContainsPointProper(
              d, axis,
              red0, redEnd, red, redIndex,
              mid);
          } else {
            red1 = partitionContainsPoint(
              d, axis,
              red0, redEnd, red, redIndex,
              mid);
          }
          if(red0 < red1) {
            if(axis === d-2) {
              if(flip) {
                retval = sweep.sweepBipartite(
                  d, visit,
                  blue0, blue1, blue, blueIndex,
                  red0, red1, red, redIndex);
              } else {
                retval = sweep.sweepBipartite(
                  d, visit,
                  red0, red1, red, redIndex,
                  blue0, blue1, blue, blueIndex);
              }
            } else {
              iterPush(top++,
                axis+1,
                red0, red1,
                blue0, blue1,
                flip,
                -Infinity, Infinity);
              iterPush(top++,
                axis+1,
                blue0, blue1,
                red0, red1,
                flip^1,
                -Infinity, Infinity);
            }
          }
        }
      }
    }
  }
}

var boxIntersect_1 = boxIntersectWrapper;





function boxEmpty(d, box) {
  for(var j=0; j<d; ++j) {
    if(!(box[j] <= box[j+d])) {
      return true
    }
  }
  return false
}

//Unpack boxes into a flat typed array, remove empty boxes
function convertBoxes(boxes, d, data, ids) {
  var ptr = 0;
  var count = 0;
  for(var i=0, n=boxes.length; i<n; ++i) {
    var b = boxes[i];
    if(boxEmpty(d, b)) {
      continue
    }
    for(var j=0; j<2*d; ++j) {
      data[ptr++] = b[j];
    }
    ids[count++] = i;
  }
  return count
}

//Perform type conversions, check bounds
function boxIntersect(red, blue, visit, full) {
  var n = red.length;
  var m = blue.length;

  //If either array is empty, then we can skip this whole thing
  if(n <= 0 || m <= 0) {
    return
  }

  //Compute dimension, if it is 0 then we skip
  var d = (red[0].length)>>>1;
  if(d <= 0) {
    return
  }

  var retval;

  //Convert red boxes
  var redList  = pool.mallocDouble(2*d*n);
  var redIds   = pool.mallocInt32(n);
  n = convertBoxes(red, d, redList, redIds);

  if(n > 0) {
    if(d === 1 && full) {
      //Special case: 1d complete
      sweep.init(n);
      retval = sweep.sweepComplete(
        d, visit, 
        0, n, redList, redIds,
        0, n, redList, redIds);
    } else {

      //Convert blue boxes
      var blueList = pool.mallocDouble(2*d*m);
      var blueIds  = pool.mallocInt32(m);
      m = convertBoxes(blue, d, blueList, blueIds);

      if(m > 0) {
        sweep.init(n+m);

        if(d === 1) {
          //Special case: 1d bipartite
          retval = sweep.sweepBipartite(
            d, visit, 
            0, n, redList,  redIds,
            0, m, blueList, blueIds);
        } else {
          //General case:  d>1
          retval = intersect(
            d, visit,    full,
            n, redList,  redIds,
            m, blueList, blueIds);
        }

        pool.free(blueList);
        pool.free(blueIds);
      }
    }

    pool.free(redList);
    pool.free(redIds);
  }

  return retval
}


var RESULT;

function appendItem(i,j) {
  RESULT.push([i,j]);
}

function intersectFullArray(x) {
  RESULT = [];
  boxIntersect(x, x, appendItem, true);
  return RESULT
}

function intersectBipartiteArray(x, y) {
  RESULT = [];
  boxIntersect(x, y, appendItem, false);
  return RESULT
}

//User-friendly wrapper, handle full input and no-visitor cases
function boxIntersectWrapper(arg0, arg1, arg2) {
  switch(arguments.length) {
    case 1:
      return intersectFullArray(arg0)
    case 2:
      if(typeof arg1 === 'function') {
        return boxIntersect(arg0, arg0, arg1, true)
      } else {
        return intersectBipartiteArray(arg0, arg1)
      }
    case 3:
      return boxIntersect(arg0, arg1, arg2, false)
    default:
      throw new Error('box-intersect: Invalid arguments')
  }
}

var segseg = segmentsIntersect;

var orient$2 = orientation_1[3];

function checkCollinear(a0, a1, b0, b1) {

  for(var d=0; d<2; ++d) {
    var x0 = a0[d];
    var y0 = a1[d];
    var l0 = Math.min(x0, y0);
    var h0 = Math.max(x0, y0);    

    var x1 = b0[d];
    var y1 = b1[d];
    var l1 = Math.min(x1, y1);
    var h1 = Math.max(x1, y1);    

    if(h1 < l0 || h0 < l1) {
      return false
    }
  }

  return true
}

function segmentsIntersect(a0, a1, b0, b1) {
  var x0 = orient$2(a0, b0, b1);
  var y0 = orient$2(a1, b0, b1);
  if((x0 > 0 && y0 > 0) || (x0 < 0 && y0 < 0)) {
    return false
  }

  var x1 = orient$2(b0, a0, a1);
  var y1 = orient$2(b1, a0, a1);
  if((x1 > 0 && y1 > 0) || (x1 < 0 && y1 < 0)) {
    return false
  }

  //Check for degenerate collinear case
  if(x0 === 0 && y0 === 0 && x1 === 0 && y1 === 0) {
    return checkCollinear(a0, a1, b0, b1)
  }

  return true
}

var bn = createCommonjsModule(function (module) {
(function (module, exports) {

  // Utils
  function assert (val, msg) {
    if (!val) throw new Error(msg || 'Assertion failed');
  }

  // Could use `inherits` module, but don't want to move from single file
  // architecture yet.
  function inherits (ctor, superCtor) {
    ctor.super_ = superCtor;
    var TempCtor = function () {};
    TempCtor.prototype = superCtor.prototype;
    ctor.prototype = new TempCtor();
    ctor.prototype.constructor = ctor;
  }

  // BN

  function BN (number, base, endian) {
    if (BN.isBN(number)) {
      return number;
    }

    this.negative = 0;
    this.words = null;
    this.length = 0;

    // Reduction context
    this.red = null;

    if (number !== null) {
      if (base === 'le' || base === 'be') {
        endian = base;
        base = 10;
      }

      this._init(number || 0, base || 10, endian || 'be');
    }
  }
  if (typeof module === 'object') {
    module.exports = BN;
  } else {
    exports.BN = BN;
  }

  BN.BN = BN;
  BN.wordSize = 26;

  var Buffer;
  try {
    Buffer = bufferEs6.Buffer;
  } catch (e) {
  }

  BN.isBN = function isBN (num) {
    if (num instanceof BN) {
      return true;
    }

    return num !== null && typeof num === 'object' &&
      num.constructor.wordSize === BN.wordSize && Array.isArray(num.words);
  };

  BN.max = function max (left, right) {
    if (left.cmp(right) > 0) return left;
    return right;
  };

  BN.min = function min (left, right) {
    if (left.cmp(right) < 0) return left;
    return right;
  };

  BN.prototype._init = function init (number, base, endian) {
    if (typeof number === 'number') {
      return this._initNumber(number, base, endian);
    }

    if (typeof number === 'object') {
      return this._initArray(number, base, endian);
    }

    if (base === 'hex') {
      base = 16;
    }
    assert(base === (base | 0) && base >= 2 && base <= 36);

    number = number.toString().replace(/\s+/g, '');
    var start = 0;
    if (number[0] === '-') {
      start++;
    }

    if (base === 16) {
      this._parseHex(number, start);
    } else {
      this._parseBase(number, base, start);
    }

    if (number[0] === '-') {
      this.negative = 1;
    }

    this.strip();

    if (endian !== 'le') return;

    this._initArray(this.toArray(), base, endian);
  };

  BN.prototype._initNumber = function _initNumber (number, base, endian) {
    if (number < 0) {
      this.negative = 1;
      number = -number;
    }
    if (number < 0x4000000) {
      this.words = [ number & 0x3ffffff ];
      this.length = 1;
    } else if (number < 0x10000000000000) {
      this.words = [
        number & 0x3ffffff,
        (number / 0x4000000) & 0x3ffffff
      ];
      this.length = 2;
    } else {
      assert(number < 0x20000000000000); // 2 ^ 53 (unsafe)
      this.words = [
        number & 0x3ffffff,
        (number / 0x4000000) & 0x3ffffff,
        1
      ];
      this.length = 3;
    }

    if (endian !== 'le') return;

    // Reverse the bytes
    this._initArray(this.toArray(), base, endian);
  };

  BN.prototype._initArray = function _initArray (number, base, endian) {
    // Perhaps a Uint8Array
    assert(typeof number.length === 'number');
    if (number.length <= 0) {
      this.words = [ 0 ];
      this.length = 1;
      return this;
    }

    this.length = Math.ceil(number.length / 3);
    this.words = new Array(this.length);
    for (var i = 0; i < this.length; i++) {
      this.words[i] = 0;
    }

    var j, w;
    var off = 0;
    if (endian === 'be') {
      for (i = number.length - 1, j = 0; i >= 0; i -= 3) {
        w = number[i] | (number[i - 1] << 8) | (number[i - 2] << 16);
        this.words[j] |= (w << off) & 0x3ffffff;
        this.words[j + 1] = (w >>> (26 - off)) & 0x3ffffff;
        off += 24;
        if (off >= 26) {
          off -= 26;
          j++;
        }
      }
    } else if (endian === 'le') {
      for (i = 0, j = 0; i < number.length; i += 3) {
        w = number[i] | (number[i + 1] << 8) | (number[i + 2] << 16);
        this.words[j] |= (w << off) & 0x3ffffff;
        this.words[j + 1] = (w >>> (26 - off)) & 0x3ffffff;
        off += 24;
        if (off >= 26) {
          off -= 26;
          j++;
        }
      }
    }
    return this.strip();
  };

  function parseHex (str, start, end) {
    var r = 0;
    var len = Math.min(str.length, end);
    for (var i = start; i < len; i++) {
      var c = str.charCodeAt(i) - 48;

      r <<= 4;

      // 'a' - 'f'
      if (c >= 49 && c <= 54) {
        r |= c - 49 + 0xa;

      // 'A' - 'F'
      } else if (c >= 17 && c <= 22) {
        r |= c - 17 + 0xa;

      // '0' - '9'
      } else {
        r |= c & 0xf;
      }
    }
    return r;
  }

  BN.prototype._parseHex = function _parseHex (number, start) {
    // Create possibly bigger array to ensure that it fits the number
    this.length = Math.ceil((number.length - start) / 6);
    this.words = new Array(this.length);
    for (var i = 0; i < this.length; i++) {
      this.words[i] = 0;
    }

    var j, w;
    // Scan 24-bit chunks and add them to the number
    var off = 0;
    for (i = number.length - 6, j = 0; i >= start; i -= 6) {
      w = parseHex(number, i, i + 6);
      this.words[j] |= (w << off) & 0x3ffffff;
      // NOTE: `0x3fffff` is intentional here, 26bits max shift + 24bit hex limb
      this.words[j + 1] |= w >>> (26 - off) & 0x3fffff;
      off += 24;
      if (off >= 26) {
        off -= 26;
        j++;
      }
    }
    if (i + 6 !== start) {
      w = parseHex(number, start, i + 6);
      this.words[j] |= (w << off) & 0x3ffffff;
      this.words[j + 1] |= w >>> (26 - off) & 0x3fffff;
    }
    this.strip();
  };

  function parseBase (str, start, end, mul) {
    var r = 0;
    var len = Math.min(str.length, end);
    for (var i = start; i < len; i++) {
      var c = str.charCodeAt(i) - 48;

      r *= mul;

      // 'a'
      if (c >= 49) {
        r += c - 49 + 0xa;

      // 'A'
      } else if (c >= 17) {
        r += c - 17 + 0xa;

      // '0' - '9'
      } else {
        r += c;
      }
    }
    return r;
  }

  BN.prototype._parseBase = function _parseBase (number, base, start) {
    // Initialize as zero
    this.words = [ 0 ];
    this.length = 1;

    // Find length of limb in base
    for (var limbLen = 0, limbPow = 1; limbPow <= 0x3ffffff; limbPow *= base) {
      limbLen++;
    }
    limbLen--;
    limbPow = (limbPow / base) | 0;

    var total = number.length - start;
    var mod = total % limbLen;
    var end = Math.min(total, total - mod) + start;

    var word = 0;
    for (var i = start; i < end; i += limbLen) {
      word = parseBase(number, i, i + limbLen, base);

      this.imuln(limbPow);
      if (this.words[0] + word < 0x4000000) {
        this.words[0] += word;
      } else {
        this._iaddn(word);
      }
    }

    if (mod !== 0) {
      var pow = 1;
      word = parseBase(number, i, number.length, base);

      for (i = 0; i < mod; i++) {
        pow *= base;
      }

      this.imuln(pow);
      if (this.words[0] + word < 0x4000000) {
        this.words[0] += word;
      } else {
        this._iaddn(word);
      }
    }
  };

  BN.prototype.copy = function copy (dest) {
    dest.words = new Array(this.length);
    for (var i = 0; i < this.length; i++) {
      dest.words[i] = this.words[i];
    }
    dest.length = this.length;
    dest.negative = this.negative;
    dest.red = this.red;
  };

  BN.prototype.clone = function clone () {
    var r = new BN(null);
    this.copy(r);
    return r;
  };

  BN.prototype._expand = function _expand (size) {
    while (this.length < size) {
      this.words[this.length++] = 0;
    }
    return this;
  };

  // Remove leading `0` from `this`
  BN.prototype.strip = function strip () {
    while (this.length > 1 && this.words[this.length - 1] === 0) {
      this.length--;
    }
    return this._normSign();
  };

  BN.prototype._normSign = function _normSign () {
    // -0 = 0
    if (this.length === 1 && this.words[0] === 0) {
      this.negative = 0;
    }
    return this;
  };

  BN.prototype.inspect = function inspect () {
    return (this.red ? '<BN-R: ' : '<BN: ') + this.toString(16) + '>';
  };

  /*

  var zeros = [];
  var groupSizes = [];
  var groupBases = [];

  var s = '';
  var i = -1;
  while (++i < BN.wordSize) {
    zeros[i] = s;
    s += '0';
  }
  groupSizes[0] = 0;
  groupSizes[1] = 0;
  groupBases[0] = 0;
  groupBases[1] = 0;
  var base = 2 - 1;
  while (++base < 36 + 1) {
    var groupSize = 0;
    var groupBase = 1;
    while (groupBase < (1 << BN.wordSize) / base) {
      groupBase *= base;
      groupSize += 1;
    }
    groupSizes[base] = groupSize;
    groupBases[base] = groupBase;
  }

  */

  var zeros = [
    '',
    '0',
    '00',
    '000',
    '0000',
    '00000',
    '000000',
    '0000000',
    '00000000',
    '000000000',
    '0000000000',
    '00000000000',
    '000000000000',
    '0000000000000',
    '00000000000000',
    '000000000000000',
    '0000000000000000',
    '00000000000000000',
    '000000000000000000',
    '0000000000000000000',
    '00000000000000000000',
    '000000000000000000000',
    '0000000000000000000000',
    '00000000000000000000000',
    '000000000000000000000000',
    '0000000000000000000000000'
  ];

  var groupSizes = [
    0, 0,
    25, 16, 12, 11, 10, 9, 8,
    8, 7, 7, 7, 7, 6, 6,
    6, 6, 6, 6, 6, 5, 5,
    5, 5, 5, 5, 5, 5, 5,
    5, 5, 5, 5, 5, 5, 5
  ];

  var groupBases = [
    0, 0,
    33554432, 43046721, 16777216, 48828125, 60466176, 40353607, 16777216,
    43046721, 10000000, 19487171, 35831808, 62748517, 7529536, 11390625,
    16777216, 24137569, 34012224, 47045881, 64000000, 4084101, 5153632,
    6436343, 7962624, 9765625, 11881376, 14348907, 17210368, 20511149,
    24300000, 28629151, 33554432, 39135393, 45435424, 52521875, 60466176
  ];

  BN.prototype.toString = function toString (base, padding) {
    base = base || 10;
    padding = padding | 0 || 1;

    var out;
    if (base === 16 || base === 'hex') {
      out = '';
      var off = 0;
      var carry = 0;
      for (var i = 0; i < this.length; i++) {
        var w = this.words[i];
        var word = (((w << off) | carry) & 0xffffff).toString(16);
        carry = (w >>> (24 - off)) & 0xffffff;
        if (carry !== 0 || i !== this.length - 1) {
          out = zeros[6 - word.length] + word + out;
        } else {
          out = word + out;
        }
        off += 2;
        if (off >= 26) {
          off -= 26;
          i--;
        }
      }
      if (carry !== 0) {
        out = carry.toString(16) + out;
      }
      while (out.length % padding !== 0) {
        out = '0' + out;
      }
      if (this.negative !== 0) {
        out = '-' + out;
      }
      return out;
    }

    if (base === (base | 0) && base >= 2 && base <= 36) {
      // var groupSize = Math.floor(BN.wordSize * Math.LN2 / Math.log(base));
      var groupSize = groupSizes[base];
      // var groupBase = Math.pow(base, groupSize);
      var groupBase = groupBases[base];
      out = '';
      var c = this.clone();
      c.negative = 0;
      while (!c.isZero()) {
        var r = c.modn(groupBase).toString(base);
        c = c.idivn(groupBase);

        if (!c.isZero()) {
          out = zeros[groupSize - r.length] + r + out;
        } else {
          out = r + out;
        }
      }
      if (this.isZero()) {
        out = '0' + out;
      }
      while (out.length % padding !== 0) {
        out = '0' + out;
      }
      if (this.negative !== 0) {
        out = '-' + out;
      }
      return out;
    }

    assert(false, 'Base should be between 2 and 36');
  };

  BN.prototype.toNumber = function toNumber () {
    var ret = this.words[0];
    if (this.length === 2) {
      ret += this.words[1] * 0x4000000;
    } else if (this.length === 3 && this.words[2] === 0x01) {
      // NOTE: at this stage it is known that the top bit is set
      ret += 0x10000000000000 + (this.words[1] * 0x4000000);
    } else if (this.length > 2) {
      assert(false, 'Number can only safely store up to 53 bits');
    }
    return (this.negative !== 0) ? -ret : ret;
  };

  BN.prototype.toJSON = function toJSON () {
    return this.toString(16);
  };

  BN.prototype.toBuffer = function toBuffer (endian, length) {
    assert(typeof Buffer !== 'undefined');
    return this.toArrayLike(Buffer, endian, length);
  };

  BN.prototype.toArray = function toArray (endian, length) {
    return this.toArrayLike(Array, endian, length);
  };

  BN.prototype.toArrayLike = function toArrayLike (ArrayType, endian, length) {
    var byteLength = this.byteLength();
    var reqLength = length || Math.max(1, byteLength);
    assert(byteLength <= reqLength, 'byte array longer than desired length');
    assert(reqLength > 0, 'Requested array length <= 0');

    this.strip();
    var littleEndian = endian === 'le';
    var res = new ArrayType(reqLength);

    var b, i;
    var q = this.clone();
    if (!littleEndian) {
      // Assume big-endian
      for (i = 0; i < reqLength - byteLength; i++) {
        res[i] = 0;
      }

      for (i = 0; !q.isZero(); i++) {
        b = q.andln(0xff);
        q.iushrn(8);

        res[reqLength - i - 1] = b;
      }
    } else {
      for (i = 0; !q.isZero(); i++) {
        b = q.andln(0xff);
        q.iushrn(8);

        res[i] = b;
      }

      for (; i < reqLength; i++) {
        res[i] = 0;
      }
    }

    return res;
  };

  if (Math.clz32) {
    BN.prototype._countBits = function _countBits (w) {
      return 32 - Math.clz32(w);
    };
  } else {
    BN.prototype._countBits = function _countBits (w) {
      var t = w;
      var r = 0;
      if (t >= 0x1000) {
        r += 13;
        t >>>= 13;
      }
      if (t >= 0x40) {
        r += 7;
        t >>>= 7;
      }
      if (t >= 0x8) {
        r += 4;
        t >>>= 4;
      }
      if (t >= 0x02) {
        r += 2;
        t >>>= 2;
      }
      return r + t;
    };
  }

  BN.prototype._zeroBits = function _zeroBits (w) {
    // Short-cut
    if (w === 0) return 26;

    var t = w;
    var r = 0;
    if ((t & 0x1fff) === 0) {
      r += 13;
      t >>>= 13;
    }
    if ((t & 0x7f) === 0) {
      r += 7;
      t >>>= 7;
    }
    if ((t & 0xf) === 0) {
      r += 4;
      t >>>= 4;
    }
    if ((t & 0x3) === 0) {
      r += 2;
      t >>>= 2;
    }
    if ((t & 0x1) === 0) {
      r++;
    }
    return r;
  };

  // Return number of used bits in a BN
  BN.prototype.bitLength = function bitLength () {
    var w = this.words[this.length - 1];
    var hi = this._countBits(w);
    return (this.length - 1) * 26 + hi;
  };

  function toBitArray (num) {
    var w = new Array(num.bitLength());

    for (var bit = 0; bit < w.length; bit++) {
      var off = (bit / 26) | 0;
      var wbit = bit % 26;

      w[bit] = (num.words[off] & (1 << wbit)) >>> wbit;
    }

    return w;
  }

  // Number of trailing zero bits
  BN.prototype.zeroBits = function zeroBits () {
    if (this.isZero()) return 0;

    var r = 0;
    for (var i = 0; i < this.length; i++) {
      var b = this._zeroBits(this.words[i]);
      r += b;
      if (b !== 26) break;
    }
    return r;
  };

  BN.prototype.byteLength = function byteLength () {
    return Math.ceil(this.bitLength() / 8);
  };

  BN.prototype.toTwos = function toTwos (width) {
    if (this.negative !== 0) {
      return this.abs().inotn(width).iaddn(1);
    }
    return this.clone();
  };

  BN.prototype.fromTwos = function fromTwos (width) {
    if (this.testn(width - 1)) {
      return this.notn(width).iaddn(1).ineg();
    }
    return this.clone();
  };

  BN.prototype.isNeg = function isNeg () {
    return this.negative !== 0;
  };

  // Return negative clone of `this`
  BN.prototype.neg = function neg () {
    return this.clone().ineg();
  };

  BN.prototype.ineg = function ineg () {
    if (!this.isZero()) {
      this.negative ^= 1;
    }

    return this;
  };

  // Or `num` with `this` in-place
  BN.prototype.iuor = function iuor (num) {
    while (this.length < num.length) {
      this.words[this.length++] = 0;
    }

    for (var i = 0; i < num.length; i++) {
      this.words[i] = this.words[i] | num.words[i];
    }

    return this.strip();
  };

  BN.prototype.ior = function ior (num) {
    assert((this.negative | num.negative) === 0);
    return this.iuor(num);
  };

  // Or `num` with `this`
  BN.prototype.or = function or (num) {
    if (this.length > num.length) return this.clone().ior(num);
    return num.clone().ior(this);
  };

  BN.prototype.uor = function uor (num) {
    if (this.length > num.length) return this.clone().iuor(num);
    return num.clone().iuor(this);
  };

  // And `num` with `this` in-place
  BN.prototype.iuand = function iuand (num) {
    // b = min-length(num, this)
    var b;
    if (this.length > num.length) {
      b = num;
    } else {
      b = this;
    }

    for (var i = 0; i < b.length; i++) {
      this.words[i] = this.words[i] & num.words[i];
    }

    this.length = b.length;

    return this.strip();
  };

  BN.prototype.iand = function iand (num) {
    assert((this.negative | num.negative) === 0);
    return this.iuand(num);
  };

  // And `num` with `this`
  BN.prototype.and = function and (num) {
    if (this.length > num.length) return this.clone().iand(num);
    return num.clone().iand(this);
  };

  BN.prototype.uand = function uand (num) {
    if (this.length > num.length) return this.clone().iuand(num);
    return num.clone().iuand(this);
  };

  // Xor `num` with `this` in-place
  BN.prototype.iuxor = function iuxor (num) {
    // a.length > b.length
    var a;
    var b;
    if (this.length > num.length) {
      a = this;
      b = num;
    } else {
      a = num;
      b = this;
    }

    for (var i = 0; i < b.length; i++) {
      this.words[i] = a.words[i] ^ b.words[i];
    }

    if (this !== a) {
      for (; i < a.length; i++) {
        this.words[i] = a.words[i];
      }
    }

    this.length = a.length;

    return this.strip();
  };

  BN.prototype.ixor = function ixor (num) {
    assert((this.negative | num.negative) === 0);
    return this.iuxor(num);
  };

  // Xor `num` with `this`
  BN.prototype.xor = function xor (num) {
    if (this.length > num.length) return this.clone().ixor(num);
    return num.clone().ixor(this);
  };

  BN.prototype.uxor = function uxor (num) {
    if (this.length > num.length) return this.clone().iuxor(num);
    return num.clone().iuxor(this);
  };

  // Not ``this`` with ``width`` bitwidth
  BN.prototype.inotn = function inotn (width) {
    assert(typeof width === 'number' && width >= 0);

    var bytesNeeded = Math.ceil(width / 26) | 0;
    var bitsLeft = width % 26;

    // Extend the buffer with leading zeroes
    this._expand(bytesNeeded);

    if (bitsLeft > 0) {
      bytesNeeded--;
    }

    // Handle complete words
    for (var i = 0; i < bytesNeeded; i++) {
      this.words[i] = ~this.words[i] & 0x3ffffff;
    }

    // Handle the residue
    if (bitsLeft > 0) {
      this.words[i] = ~this.words[i] & (0x3ffffff >> (26 - bitsLeft));
    }

    // And remove leading zeroes
    return this.strip();
  };

  BN.prototype.notn = function notn (width) {
    return this.clone().inotn(width);
  };

  // Set `bit` of `this`
  BN.prototype.setn = function setn (bit, val) {
    assert(typeof bit === 'number' && bit >= 0);

    var off = (bit / 26) | 0;
    var wbit = bit % 26;

    this._expand(off + 1);

    if (val) {
      this.words[off] = this.words[off] | (1 << wbit);
    } else {
      this.words[off] = this.words[off] & ~(1 << wbit);
    }

    return this.strip();
  };

  // Add `num` to `this` in-place
  BN.prototype.iadd = function iadd (num) {
    var r;

    // negative + positive
    if (this.negative !== 0 && num.negative === 0) {
      this.negative = 0;
      r = this.isub(num);
      this.negative ^= 1;
      return this._normSign();

    // positive + negative
    } else if (this.negative === 0 && num.negative !== 0) {
      num.negative = 0;
      r = this.isub(num);
      num.negative = 1;
      return r._normSign();
    }

    // a.length > b.length
    var a, b;
    if (this.length > num.length) {
      a = this;
      b = num;
    } else {
      a = num;
      b = this;
    }

    var carry = 0;
    for (var i = 0; i < b.length; i++) {
      r = (a.words[i] | 0) + (b.words[i] | 0) + carry;
      this.words[i] = r & 0x3ffffff;
      carry = r >>> 26;
    }
    for (; carry !== 0 && i < a.length; i++) {
      r = (a.words[i] | 0) + carry;
      this.words[i] = r & 0x3ffffff;
      carry = r >>> 26;
    }

    this.length = a.length;
    if (carry !== 0) {
      this.words[this.length] = carry;
      this.length++;
    // Copy the rest of the words
    } else if (a !== this) {
      for (; i < a.length; i++) {
        this.words[i] = a.words[i];
      }
    }

    return this;
  };

  // Add `num` to `this`
  BN.prototype.add = function add (num) {
    var res;
    if (num.negative !== 0 && this.negative === 0) {
      num.negative = 0;
      res = this.sub(num);
      num.negative ^= 1;
      return res;
    } else if (num.negative === 0 && this.negative !== 0) {
      this.negative = 0;
      res = num.sub(this);
      this.negative = 1;
      return res;
    }

    if (this.length > num.length) return this.clone().iadd(num);

    return num.clone().iadd(this);
  };

  // Subtract `num` from `this` in-place
  BN.prototype.isub = function isub (num) {
    // this - (-num) = this + num
    if (num.negative !== 0) {
      num.negative = 0;
      var r = this.iadd(num);
      num.negative = 1;
      return r._normSign();

    // -this - num = -(this + num)
    } else if (this.negative !== 0) {
      this.negative = 0;
      this.iadd(num);
      this.negative = 1;
      return this._normSign();
    }

    // At this point both numbers are positive
    var cmp = this.cmp(num);

    // Optimization - zeroify
    if (cmp === 0) {
      this.negative = 0;
      this.length = 1;
      this.words[0] = 0;
      return this;
    }

    // a > b
    var a, b;
    if (cmp > 0) {
      a = this;
      b = num;
    } else {
      a = num;
      b = this;
    }

    var carry = 0;
    for (var i = 0; i < b.length; i++) {
      r = (a.words[i] | 0) - (b.words[i] | 0) + carry;
      carry = r >> 26;
      this.words[i] = r & 0x3ffffff;
    }
    for (; carry !== 0 && i < a.length; i++) {
      r = (a.words[i] | 0) + carry;
      carry = r >> 26;
      this.words[i] = r & 0x3ffffff;
    }

    // Copy rest of the words
    if (carry === 0 && i < a.length && a !== this) {
      for (; i < a.length; i++) {
        this.words[i] = a.words[i];
      }
    }

    this.length = Math.max(this.length, i);

    if (a !== this) {
      this.negative = 1;
    }

    return this.strip();
  };

  // Subtract `num` from `this`
  BN.prototype.sub = function sub (num) {
    return this.clone().isub(num);
  };

  function smallMulTo (self, num, out) {
    out.negative = num.negative ^ self.negative;
    var len = (self.length + num.length) | 0;
    out.length = len;
    len = (len - 1) | 0;

    // Peel one iteration (compiler can't do it, because of code complexity)
    var a = self.words[0] | 0;
    var b = num.words[0] | 0;
    var r = a * b;

    var lo = r & 0x3ffffff;
    var carry = (r / 0x4000000) | 0;
    out.words[0] = lo;

    for (var k = 1; k < len; k++) {
      // Sum all words with the same `i + j = k` and accumulate `ncarry`,
      // note that ncarry could be >= 0x3ffffff
      var ncarry = carry >>> 26;
      var rword = carry & 0x3ffffff;
      var maxJ = Math.min(k, num.length - 1);
      for (var j = Math.max(0, k - self.length + 1); j <= maxJ; j++) {
        var i = (k - j) | 0;
        a = self.words[i] | 0;
        b = num.words[j] | 0;
        r = a * b + rword;
        ncarry += (r / 0x4000000) | 0;
        rword = r & 0x3ffffff;
      }
      out.words[k] = rword | 0;
      carry = ncarry | 0;
    }
    if (carry !== 0) {
      out.words[k] = carry | 0;
    } else {
      out.length--;
    }

    return out.strip();
  }

  // TODO(indutny): it may be reasonable to omit it for users who don't need
  // to work with 256-bit numbers, otherwise it gives 20% improvement for 256-bit
  // multiplication (like elliptic secp256k1).
  var comb10MulTo = function comb10MulTo (self, num, out) {
    var a = self.words;
    var b = num.words;
    var o = out.words;
    var c = 0;
    var lo;
    var mid;
    var hi;
    var a0 = a[0] | 0;
    var al0 = a0 & 0x1fff;
    var ah0 = a0 >>> 13;
    var a1 = a[1] | 0;
    var al1 = a1 & 0x1fff;
    var ah1 = a1 >>> 13;
    var a2 = a[2] | 0;
    var al2 = a2 & 0x1fff;
    var ah2 = a2 >>> 13;
    var a3 = a[3] | 0;
    var al3 = a3 & 0x1fff;
    var ah3 = a3 >>> 13;
    var a4 = a[4] | 0;
    var al4 = a4 & 0x1fff;
    var ah4 = a4 >>> 13;
    var a5 = a[5] | 0;
    var al5 = a5 & 0x1fff;
    var ah5 = a5 >>> 13;
    var a6 = a[6] | 0;
    var al6 = a6 & 0x1fff;
    var ah6 = a6 >>> 13;
    var a7 = a[7] | 0;
    var al7 = a7 & 0x1fff;
    var ah7 = a7 >>> 13;
    var a8 = a[8] | 0;
    var al8 = a8 & 0x1fff;
    var ah8 = a8 >>> 13;
    var a9 = a[9] | 0;
    var al9 = a9 & 0x1fff;
    var ah9 = a9 >>> 13;
    var b0 = b[0] | 0;
    var bl0 = b0 & 0x1fff;
    var bh0 = b0 >>> 13;
    var b1 = b[1] | 0;
    var bl1 = b1 & 0x1fff;
    var bh1 = b1 >>> 13;
    var b2 = b[2] | 0;
    var bl2 = b2 & 0x1fff;
    var bh2 = b2 >>> 13;
    var b3 = b[3] | 0;
    var bl3 = b3 & 0x1fff;
    var bh3 = b3 >>> 13;
    var b4 = b[4] | 0;
    var bl4 = b4 & 0x1fff;
    var bh4 = b4 >>> 13;
    var b5 = b[5] | 0;
    var bl5 = b5 & 0x1fff;
    var bh5 = b5 >>> 13;
    var b6 = b[6] | 0;
    var bl6 = b6 & 0x1fff;
    var bh6 = b6 >>> 13;
    var b7 = b[7] | 0;
    var bl7 = b7 & 0x1fff;
    var bh7 = b7 >>> 13;
    var b8 = b[8] | 0;
    var bl8 = b8 & 0x1fff;
    var bh8 = b8 >>> 13;
    var b9 = b[9] | 0;
    var bl9 = b9 & 0x1fff;
    var bh9 = b9 >>> 13;

    out.negative = self.negative ^ num.negative;
    out.length = 19;
    /* k = 0 */
    lo = Math.imul(al0, bl0);
    mid = Math.imul(al0, bh0);
    mid = (mid + Math.imul(ah0, bl0)) | 0;
    hi = Math.imul(ah0, bh0);
    var w0 = (((c + lo) | 0) + ((mid & 0x1fff) << 13)) | 0;
    c = (((hi + (mid >>> 13)) | 0) + (w0 >>> 26)) | 0;
    w0 &= 0x3ffffff;
    /* k = 1 */
    lo = Math.imul(al1, bl0);
    mid = Math.imul(al1, bh0);
    mid = (mid + Math.imul(ah1, bl0)) | 0;
    hi = Math.imul(ah1, bh0);
    lo = (lo + Math.imul(al0, bl1)) | 0;
    mid = (mid + Math.imul(al0, bh1)) | 0;
    mid = (mid + Math.imul(ah0, bl1)) | 0;
    hi = (hi + Math.imul(ah0, bh1)) | 0;
    var w1 = (((c + lo) | 0) + ((mid & 0x1fff) << 13)) | 0;
    c = (((hi + (mid >>> 13)) | 0) + (w1 >>> 26)) | 0;
    w1 &= 0x3ffffff;
    /* k = 2 */
    lo = Math.imul(al2, bl0);
    mid = Math.imul(al2, bh0);
    mid = (mid + Math.imul(ah2, bl0)) | 0;
    hi = Math.imul(ah2, bh0);
    lo = (lo + Math.imul(al1, bl1)) | 0;
    mid = (mid + Math.imul(al1, bh1)) | 0;
    mid = (mid + Math.imul(ah1, bl1)) | 0;
    hi = (hi + Math.imul(ah1, bh1)) | 0;
    lo = (lo + Math.imul(al0, bl2)) | 0;
    mid = (mid + Math.imul(al0, bh2)) | 0;
    mid = (mid + Math.imul(ah0, bl2)) | 0;
    hi = (hi + Math.imul(ah0, bh2)) | 0;
    var w2 = (((c + lo) | 0) + ((mid & 0x1fff) << 13)) | 0;
    c = (((hi + (mid >>> 13)) | 0) + (w2 >>> 26)) | 0;
    w2 &= 0x3ffffff;
    /* k = 3 */
    lo = Math.imul(al3, bl0);
    mid = Math.imul(al3, bh0);
    mid = (mid + Math.imul(ah3, bl0)) | 0;
    hi = Math.imul(ah3, bh0);
    lo = (lo + Math.imul(al2, bl1)) | 0;
    mid = (mid + Math.imul(al2, bh1)) | 0;
    mid = (mid + Math.imul(ah2, bl1)) | 0;
    hi = (hi + Math.imul(ah2, bh1)) | 0;
    lo = (lo + Math.imul(al1, bl2)) | 0;
    mid = (mid + Math.imul(al1, bh2)) | 0;
    mid = (mid + Math.imul(ah1, bl2)) | 0;
    hi = (hi + Math.imul(ah1, bh2)) | 0;
    lo = (lo + Math.imul(al0, bl3)) | 0;
    mid = (mid + Math.imul(al0, bh3)) | 0;
    mid = (mid + Math.imul(ah0, bl3)) | 0;
    hi = (hi + Math.imul(ah0, bh3)) | 0;
    var w3 = (((c + lo) | 0) + ((mid & 0x1fff) << 13)) | 0;
    c = (((hi + (mid >>> 13)) | 0) + (w3 >>> 26)) | 0;
    w3 &= 0x3ffffff;
    /* k = 4 */
    lo = Math.imul(al4, bl0);
    mid = Math.imul(al4, bh0);
    mid = (mid + Math.imul(ah4, bl0)) | 0;
    hi = Math.imul(ah4, bh0);
    lo = (lo + Math.imul(al3, bl1)) | 0;
    mid = (mid + Math.imul(al3, bh1)) | 0;
    mid = (mid + Math.imul(ah3, bl1)) | 0;
    hi = (hi + Math.imul(ah3, bh1)) | 0;
    lo = (lo + Math.imul(al2, bl2)) | 0;
    mid = (mid + Math.imul(al2, bh2)) | 0;
    mid = (mid + Math.imul(ah2, bl2)) | 0;
    hi = (hi + Math.imul(ah2, bh2)) | 0;
    lo = (lo + Math.imul(al1, bl3)) | 0;
    mid = (mid + Math.imul(al1, bh3)) | 0;
    mid = (mid + Math.imul(ah1, bl3)) | 0;
    hi = (hi + Math.imul(ah1, bh3)) | 0;
    lo = (lo + Math.imul(al0, bl4)) | 0;
    mid = (mid + Math.imul(al0, bh4)) | 0;
    mid = (mid + Math.imul(ah0, bl4)) | 0;
    hi = (hi + Math.imul(ah0, bh4)) | 0;
    var w4 = (((c + lo) | 0) + ((mid & 0x1fff) << 13)) | 0;
    c = (((hi + (mid >>> 13)) | 0) + (w4 >>> 26)) | 0;
    w4 &= 0x3ffffff;
    /* k = 5 */
    lo = Math.imul(al5, bl0);
    mid = Math.imul(al5, bh0);
    mid = (mid + Math.imul(ah5, bl0)) | 0;
    hi = Math.imul(ah5, bh0);
    lo = (lo + Math.imul(al4, bl1)) | 0;
    mid = (mid + Math.imul(al4, bh1)) | 0;
    mid = (mid + Math.imul(ah4, bl1)) | 0;
    hi = (hi + Math.imul(ah4, bh1)) | 0;
    lo = (lo + Math.imul(al3, bl2)) | 0;
    mid = (mid + Math.imul(al3, bh2)) | 0;
    mid = (mid + Math.imul(ah3, bl2)) | 0;
    hi = (hi + Math.imul(ah3, bh2)) | 0;
    lo = (lo + Math.imul(al2, bl3)) | 0;
    mid = (mid + Math.imul(al2, bh3)) | 0;
    mid = (mid + Math.imul(ah2, bl3)) | 0;
    hi = (hi + Math.imul(ah2, bh3)) | 0;
    lo = (lo + Math.imul(al1, bl4)) | 0;
    mid = (mid + Math.imul(al1, bh4)) | 0;
    mid = (mid + Math.imul(ah1, bl4)) | 0;
    hi = (hi + Math.imul(ah1, bh4)) | 0;
    lo = (lo + Math.imul(al0, bl5)) | 0;
    mid = (mid + Math.imul(al0, bh5)) | 0;
    mid = (mid + Math.imul(ah0, bl5)) | 0;
    hi = (hi + Math.imul(ah0, bh5)) | 0;
    var w5 = (((c + lo) | 0) + ((mid & 0x1fff) << 13)) | 0;
    c = (((hi + (mid >>> 13)) | 0) + (w5 >>> 26)) | 0;
    w5 &= 0x3ffffff;
    /* k = 6 */
    lo = Math.imul(al6, bl0);
    mid = Math.imul(al6, bh0);
    mid = (mid + Math.imul(ah6, bl0)) | 0;
    hi = Math.imul(ah6, bh0);
    lo = (lo + Math.imul(al5, bl1)) | 0;
    mid = (mid + Math.imul(al5, bh1)) | 0;
    mid = (mid + Math.imul(ah5, bl1)) | 0;
    hi = (hi + Math.imul(ah5, bh1)) | 0;
    lo = (lo + Math.imul(al4, bl2)) | 0;
    mid = (mid + Math.imul(al4, bh2)) | 0;
    mid = (mid + Math.imul(ah4, bl2)) | 0;
    hi = (hi + Math.imul(ah4, bh2)) | 0;
    lo = (lo + Math.imul(al3, bl3)) | 0;
    mid = (mid + Math.imul(al3, bh3)) | 0;
    mid = (mid + Math.imul(ah3, bl3)) | 0;
    hi = (hi + Math.imul(ah3, bh3)) | 0;
    lo = (lo + Math.imul(al2, bl4)) | 0;
    mid = (mid + Math.imul(al2, bh4)) | 0;
    mid = (mid + Math.imul(ah2, bl4)) | 0;
    hi = (hi + Math.imul(ah2, bh4)) | 0;
    lo = (lo + Math.imul(al1, bl5)) | 0;
    mid = (mid + Math.imul(al1, bh5)) | 0;
    mid = (mid + Math.imul(ah1, bl5)) | 0;
    hi = (hi + Math.imul(ah1, bh5)) | 0;
    lo = (lo + Math.imul(al0, bl6)) | 0;
    mid = (mid + Math.imul(al0, bh6)) | 0;
    mid = (mid + Math.imul(ah0, bl6)) | 0;
    hi = (hi + Math.imul(ah0, bh6)) | 0;
    var w6 = (((c + lo) | 0) + ((mid & 0x1fff) << 13)) | 0;
    c = (((hi + (mid >>> 13)) | 0) + (w6 >>> 26)) | 0;
    w6 &= 0x3ffffff;
    /* k = 7 */
    lo = Math.imul(al7, bl0);
    mid = Math.imul(al7, bh0);
    mid = (mid + Math.imul(ah7, bl0)) | 0;
    hi = Math.imul(ah7, bh0);
    lo = (lo + Math.imul(al6, bl1)) | 0;
    mid = (mid + Math.imul(al6, bh1)) | 0;
    mid = (mid + Math.imul(ah6, bl1)) | 0;
    hi = (hi + Math.imul(ah6, bh1)) | 0;
    lo = (lo + Math.imul(al5, bl2)) | 0;
    mid = (mid + Math.imul(al5, bh2)) | 0;
    mid = (mid + Math.imul(ah5, bl2)) | 0;
    hi = (hi + Math.imul(ah5, bh2)) | 0;
    lo = (lo + Math.imul(al4, bl3)) | 0;
    mid = (mid + Math.imul(al4, bh3)) | 0;
    mid = (mid + Math.imul(ah4, bl3)) | 0;
    hi = (hi + Math.imul(ah4, bh3)) | 0;
    lo = (lo + Math.imul(al3, bl4)) | 0;
    mid = (mid + Math.imul(al3, bh4)) | 0;
    mid = (mid + Math.imul(ah3, bl4)) | 0;
    hi = (hi + Math.imul(ah3, bh4)) | 0;
    lo = (lo + Math.imul(al2, bl5)) | 0;
    mid = (mid + Math.imul(al2, bh5)) | 0;
    mid = (mid + Math.imul(ah2, bl5)) | 0;
    hi = (hi + Math.imul(ah2, bh5)) | 0;
    lo = (lo + Math.imul(al1, bl6)) | 0;
    mid = (mid + Math.imul(al1, bh6)) | 0;
    mid = (mid + Math.imul(ah1, bl6)) | 0;
    hi = (hi + Math.imul(ah1, bh6)) | 0;
    lo = (lo + Math.imul(al0, bl7)) | 0;
    mid = (mid + Math.imul(al0, bh7)) | 0;
    mid = (mid + Math.imul(ah0, bl7)) | 0;
    hi = (hi + Math.imul(ah0, bh7)) | 0;
    var w7 = (((c + lo) | 0) + ((mid & 0x1fff) << 13)) | 0;
    c = (((hi + (mid >>> 13)) | 0) + (w7 >>> 26)) | 0;
    w7 &= 0x3ffffff;
    /* k = 8 */
    lo = Math.imul(al8, bl0);
    mid = Math.imul(al8, bh0);
    mid = (mid + Math.imul(ah8, bl0)) | 0;
    hi = Math.imul(ah8, bh0);
    lo = (lo + Math.imul(al7, bl1)) | 0;
    mid = (mid + Math.imul(al7, bh1)) | 0;
    mid = (mid + Math.imul(ah7, bl1)) | 0;
    hi = (hi + Math.imul(ah7, bh1)) | 0;
    lo = (lo + Math.imul(al6, bl2)) | 0;
    mid = (mid + Math.imul(al6, bh2)) | 0;
    mid = (mid + Math.imul(ah6, bl2)) | 0;
    hi = (hi + Math.imul(ah6, bh2)) | 0;
    lo = (lo + Math.imul(al5, bl3)) | 0;
    mid = (mid + Math.imul(al5, bh3)) | 0;
    mid = (mid + Math.imul(ah5, bl3)) | 0;
    hi = (hi + Math.imul(ah5, bh3)) | 0;
    lo = (lo + Math.imul(al4, bl4)) | 0;
    mid = (mid + Math.imul(al4, bh4)) | 0;
    mid = (mid + Math.imul(ah4, bl4)) | 0;
    hi = (hi + Math.imul(ah4, bh4)) | 0;
    lo = (lo + Math.imul(al3, bl5)) | 0;
    mid = (mid + Math.imul(al3, bh5)) | 0;
    mid = (mid + Math.imul(ah3, bl5)) | 0;
    hi = (hi + Math.imul(ah3, bh5)) | 0;
    lo = (lo + Math.imul(al2, bl6)) | 0;
    mid = (mid + Math.imul(al2, bh6)) | 0;
    mid = (mid + Math.imul(ah2, bl6)) | 0;
    hi = (hi + Math.imul(ah2, bh6)) | 0;
    lo = (lo + Math.imul(al1, bl7)) | 0;
    mid = (mid + Math.imul(al1, bh7)) | 0;
    mid = (mid + Math.imul(ah1, bl7)) | 0;
    hi = (hi + Math.imul(ah1, bh7)) | 0;
    lo = (lo + Math.imul(al0, bl8)) | 0;
    mid = (mid + Math.imul(al0, bh8)) | 0;
    mid = (mid + Math.imul(ah0, bl8)) | 0;
    hi = (hi + Math.imul(ah0, bh8)) | 0;
    var w8 = (((c + lo) | 0) + ((mid & 0x1fff) << 13)) | 0;
    c = (((hi + (mid >>> 13)) | 0) + (w8 >>> 26)) | 0;
    w8 &= 0x3ffffff;
    /* k = 9 */
    lo = Math.imul(al9, bl0);
    mid = Math.imul(al9, bh0);
    mid = (mid + Math.imul(ah9, bl0)) | 0;
    hi = Math.imul(ah9, bh0);
    lo = (lo + Math.imul(al8, bl1)) | 0;
    mid = (mid + Math.imul(al8, bh1)) | 0;
    mid = (mid + Math.imul(ah8, bl1)) | 0;
    hi = (hi + Math.imul(ah8, bh1)) | 0;
    lo = (lo + Math.imul(al7, bl2)) | 0;
    mid = (mid + Math.imul(al7, bh2)) | 0;
    mid = (mid + Math.imul(ah7, bl2)) | 0;
    hi = (hi + Math.imul(ah7, bh2)) | 0;
    lo = (lo + Math.imul(al6, bl3)) | 0;
    mid = (mid + Math.imul(al6, bh3)) | 0;
    mid = (mid + Math.imul(ah6, bl3)) | 0;
    hi = (hi + Math.imul(ah6, bh3)) | 0;
    lo = (lo + Math.imul(al5, bl4)) | 0;
    mid = (mid + Math.imul(al5, bh4)) | 0;
    mid = (mid + Math.imul(ah5, bl4)) | 0;
    hi = (hi + Math.imul(ah5, bh4)) | 0;
    lo = (lo + Math.imul(al4, bl5)) | 0;
    mid = (mid + Math.imul(al4, bh5)) | 0;
    mid = (mid + Math.imul(ah4, bl5)) | 0;
    hi = (hi + Math.imul(ah4, bh5)) | 0;
    lo = (lo + Math.imul(al3, bl6)) | 0;
    mid = (mid + Math.imul(al3, bh6)) | 0;
    mid = (mid + Math.imul(ah3, bl6)) | 0;
    hi = (hi + Math.imul(ah3, bh6)) | 0;
    lo = (lo + Math.imul(al2, bl7)) | 0;
    mid = (mid + Math.imul(al2, bh7)) | 0;
    mid = (mid + Math.imul(ah2, bl7)) | 0;
    hi = (hi + Math.imul(ah2, bh7)) | 0;
    lo = (lo + Math.imul(al1, bl8)) | 0;
    mid = (mid + Math.imul(al1, bh8)) | 0;
    mid = (mid + Math.imul(ah1, bl8)) | 0;
    hi = (hi + Math.imul(ah1, bh8)) | 0;
    lo = (lo + Math.imul(al0, bl9)) | 0;
    mid = (mid + Math.imul(al0, bh9)) | 0;
    mid = (mid + Math.imul(ah0, bl9)) | 0;
    hi = (hi + Math.imul(ah0, bh9)) | 0;
    var w9 = (((c + lo) | 0) + ((mid & 0x1fff) << 13)) | 0;
    c = (((hi + (mid >>> 13)) | 0) + (w9 >>> 26)) | 0;
    w9 &= 0x3ffffff;
    /* k = 10 */
    lo = Math.imul(al9, bl1);
    mid = Math.imul(al9, bh1);
    mid = (mid + Math.imul(ah9, bl1)) | 0;
    hi = Math.imul(ah9, bh1);
    lo = (lo + Math.imul(al8, bl2)) | 0;
    mid = (mid + Math.imul(al8, bh2)) | 0;
    mid = (mid + Math.imul(ah8, bl2)) | 0;
    hi = (hi + Math.imul(ah8, bh2)) | 0;
    lo = (lo + Math.imul(al7, bl3)) | 0;
    mid = (mid + Math.imul(al7, bh3)) | 0;
    mid = (mid + Math.imul(ah7, bl3)) | 0;
    hi = (hi + Math.imul(ah7, bh3)) | 0;
    lo = (lo + Math.imul(al6, bl4)) | 0;
    mid = (mid + Math.imul(al6, bh4)) | 0;
    mid = (mid + Math.imul(ah6, bl4)) | 0;
    hi = (hi + Math.imul(ah6, bh4)) | 0;
    lo = (lo + Math.imul(al5, bl5)) | 0;
    mid = (mid + Math.imul(al5, bh5)) | 0;
    mid = (mid + Math.imul(ah5, bl5)) | 0;
    hi = (hi + Math.imul(ah5, bh5)) | 0;
    lo = (lo + Math.imul(al4, bl6)) | 0;
    mid = (mid + Math.imul(al4, bh6)) | 0;
    mid = (mid + Math.imul(ah4, bl6)) | 0;
    hi = (hi + Math.imul(ah4, bh6)) | 0;
    lo = (lo + Math.imul(al3, bl7)) | 0;
    mid = (mid + Math.imul(al3, bh7)) | 0;
    mid = (mid + Math.imul(ah3, bl7)) | 0;
    hi = (hi + Math.imul(ah3, bh7)) | 0;
    lo = (lo + Math.imul(al2, bl8)) | 0;
    mid = (mid + Math.imul(al2, bh8)) | 0;
    mid = (mid + Math.imul(ah2, bl8)) | 0;
    hi = (hi + Math.imul(ah2, bh8)) | 0;
    lo = (lo + Math.imul(al1, bl9)) | 0;
    mid = (mid + Math.imul(al1, bh9)) | 0;
    mid = (mid + Math.imul(ah1, bl9)) | 0;
    hi = (hi + Math.imul(ah1, bh9)) | 0;
    var w10 = (((c + lo) | 0) + ((mid & 0x1fff) << 13)) | 0;
    c = (((hi + (mid >>> 13)) | 0) + (w10 >>> 26)) | 0;
    w10 &= 0x3ffffff;
    /* k = 11 */
    lo = Math.imul(al9, bl2);
    mid = Math.imul(al9, bh2);
    mid = (mid + Math.imul(ah9, bl2)) | 0;
    hi = Math.imul(ah9, bh2);
    lo = (lo + Math.imul(al8, bl3)) | 0;
    mid = (mid + Math.imul(al8, bh3)) | 0;
    mid = (mid + Math.imul(ah8, bl3)) | 0;
    hi = (hi + Math.imul(ah8, bh3)) | 0;
    lo = (lo + Math.imul(al7, bl4)) | 0;
    mid = (mid + Math.imul(al7, bh4)) | 0;
    mid = (mid + Math.imul(ah7, bl4)) | 0;
    hi = (hi + Math.imul(ah7, bh4)) | 0;
    lo = (lo + Math.imul(al6, bl5)) | 0;
    mid = (mid + Math.imul(al6, bh5)) | 0;
    mid = (mid + Math.imul(ah6, bl5)) | 0;
    hi = (hi + Math.imul(ah6, bh5)) | 0;
    lo = (lo + Math.imul(al5, bl6)) | 0;
    mid = (mid + Math.imul(al5, bh6)) | 0;
    mid = (mid + Math.imul(ah5, bl6)) | 0;
    hi = (hi + Math.imul(ah5, bh6)) | 0;
    lo = (lo + Math.imul(al4, bl7)) | 0;
    mid = (mid + Math.imul(al4, bh7)) | 0;
    mid = (mid + Math.imul(ah4, bl7)) | 0;
    hi = (hi + Math.imul(ah4, bh7)) | 0;
    lo = (lo + Math.imul(al3, bl8)) | 0;
    mid = (mid + Math.imul(al3, bh8)) | 0;
    mid = (mid + Math.imul(ah3, bl8)) | 0;
    hi = (hi + Math.imul(ah3, bh8)) | 0;
    lo = (lo + Math.imul(al2, bl9)) | 0;
    mid = (mid + Math.imul(al2, bh9)) | 0;
    mid = (mid + Math.imul(ah2, bl9)) | 0;
    hi = (hi + Math.imul(ah2, bh9)) | 0;
    var w11 = (((c + lo) | 0) + ((mid & 0x1fff) << 13)) | 0;
    c = (((hi + (mid >>> 13)) | 0) + (w11 >>> 26)) | 0;
    w11 &= 0x3ffffff;
    /* k = 12 */
    lo = Math.imul(al9, bl3);
    mid = Math.imul(al9, bh3);
    mid = (mid + Math.imul(ah9, bl3)) | 0;
    hi = Math.imul(ah9, bh3);
    lo = (lo + Math.imul(al8, bl4)) | 0;
    mid = (mid + Math.imul(al8, bh4)) | 0;
    mid = (mid + Math.imul(ah8, bl4)) | 0;
    hi = (hi + Math.imul(ah8, bh4)) | 0;
    lo = (lo + Math.imul(al7, bl5)) | 0;
    mid = (mid + Math.imul(al7, bh5)) | 0;
    mid = (mid + Math.imul(ah7, bl5)) | 0;
    hi = (hi + Math.imul(ah7, bh5)) | 0;
    lo = (lo + Math.imul(al6, bl6)) | 0;
    mid = (mid + Math.imul(al6, bh6)) | 0;
    mid = (mid + Math.imul(ah6, bl6)) | 0;
    hi = (hi + Math.imul(ah6, bh6)) | 0;
    lo = (lo + Math.imul(al5, bl7)) | 0;
    mid = (mid + Math.imul(al5, bh7)) | 0;
    mid = (mid + Math.imul(ah5, bl7)) | 0;
    hi = (hi + Math.imul(ah5, bh7)) | 0;
    lo = (lo + Math.imul(al4, bl8)) | 0;
    mid = (mid + Math.imul(al4, bh8)) | 0;
    mid = (mid + Math.imul(ah4, bl8)) | 0;
    hi = (hi + Math.imul(ah4, bh8)) | 0;
    lo = (lo + Math.imul(al3, bl9)) | 0;
    mid = (mid + Math.imul(al3, bh9)) | 0;
    mid = (mid + Math.imul(ah3, bl9)) | 0;
    hi = (hi + Math.imul(ah3, bh9)) | 0;
    var w12 = (((c + lo) | 0) + ((mid & 0x1fff) << 13)) | 0;
    c = (((hi + (mid >>> 13)) | 0) + (w12 >>> 26)) | 0;
    w12 &= 0x3ffffff;
    /* k = 13 */
    lo = Math.imul(al9, bl4);
    mid = Math.imul(al9, bh4);
    mid = (mid + Math.imul(ah9, bl4)) | 0;
    hi = Math.imul(ah9, bh4);
    lo = (lo + Math.imul(al8, bl5)) | 0;
    mid = (mid + Math.imul(al8, bh5)) | 0;
    mid = (mid + Math.imul(ah8, bl5)) | 0;
    hi = (hi + Math.imul(ah8, bh5)) | 0;
    lo = (lo + Math.imul(al7, bl6)) | 0;
    mid = (mid + Math.imul(al7, bh6)) | 0;
    mid = (mid + Math.imul(ah7, bl6)) | 0;
    hi = (hi + Math.imul(ah7, bh6)) | 0;
    lo = (lo + Math.imul(al6, bl7)) | 0;
    mid = (mid + Math.imul(al6, bh7)) | 0;
    mid = (mid + Math.imul(ah6, bl7)) | 0;
    hi = (hi + Math.imul(ah6, bh7)) | 0;
    lo = (lo + Math.imul(al5, bl8)) | 0;
    mid = (mid + Math.imul(al5, bh8)) | 0;
    mid = (mid + Math.imul(ah5, bl8)) | 0;
    hi = (hi + Math.imul(ah5, bh8)) | 0;
    lo = (lo + Math.imul(al4, bl9)) | 0;
    mid = (mid + Math.imul(al4, bh9)) | 0;
    mid = (mid + Math.imul(ah4, bl9)) | 0;
    hi = (hi + Math.imul(ah4, bh9)) | 0;
    var w13 = (((c + lo) | 0) + ((mid & 0x1fff) << 13)) | 0;
    c = (((hi + (mid >>> 13)) | 0) + (w13 >>> 26)) | 0;
    w13 &= 0x3ffffff;
    /* k = 14 */
    lo = Math.imul(al9, bl5);
    mid = Math.imul(al9, bh5);
    mid = (mid + Math.imul(ah9, bl5)) | 0;
    hi = Math.imul(ah9, bh5);
    lo = (lo + Math.imul(al8, bl6)) | 0;
    mid = (mid + Math.imul(al8, bh6)) | 0;
    mid = (mid + Math.imul(ah8, bl6)) | 0;
    hi = (hi + Math.imul(ah8, bh6)) | 0;
    lo = (lo + Math.imul(al7, bl7)) | 0;
    mid = (mid + Math.imul(al7, bh7)) | 0;
    mid = (mid + Math.imul(ah7, bl7)) | 0;
    hi = (hi + Math.imul(ah7, bh7)) | 0;
    lo = (lo + Math.imul(al6, bl8)) | 0;
    mid = (mid + Math.imul(al6, bh8)) | 0;
    mid = (mid + Math.imul(ah6, bl8)) | 0;
    hi = (hi + Math.imul(ah6, bh8)) | 0;
    lo = (lo + Math.imul(al5, bl9)) | 0;
    mid = (mid + Math.imul(al5, bh9)) | 0;
    mid = (mid + Math.imul(ah5, bl9)) | 0;
    hi = (hi + Math.imul(ah5, bh9)) | 0;
    var w14 = (((c + lo) | 0) + ((mid & 0x1fff) << 13)) | 0;
    c = (((hi + (mid >>> 13)) | 0) + (w14 >>> 26)) | 0;
    w14 &= 0x3ffffff;
    /* k = 15 */
    lo = Math.imul(al9, bl6);
    mid = Math.imul(al9, bh6);
    mid = (mid + Math.imul(ah9, bl6)) | 0;
    hi = Math.imul(ah9, bh6);
    lo = (lo + Math.imul(al8, bl7)) | 0;
    mid = (mid + Math.imul(al8, bh7)) | 0;
    mid = (mid + Math.imul(ah8, bl7)) | 0;
    hi = (hi + Math.imul(ah8, bh7)) | 0;
    lo = (lo + Math.imul(al7, bl8)) | 0;
    mid = (mid + Math.imul(al7, bh8)) | 0;
    mid = (mid + Math.imul(ah7, bl8)) | 0;
    hi = (hi + Math.imul(ah7, bh8)) | 0;
    lo = (lo + Math.imul(al6, bl9)) | 0;
    mid = (mid + Math.imul(al6, bh9)) | 0;
    mid = (mid + Math.imul(ah6, bl9)) | 0;
    hi = (hi + Math.imul(ah6, bh9)) | 0;
    var w15 = (((c + lo) | 0) + ((mid & 0x1fff) << 13)) | 0;
    c = (((hi + (mid >>> 13)) | 0) + (w15 >>> 26)) | 0;
    w15 &= 0x3ffffff;
    /* k = 16 */
    lo = Math.imul(al9, bl7);
    mid = Math.imul(al9, bh7);
    mid = (mid + Math.imul(ah9, bl7)) | 0;
    hi = Math.imul(ah9, bh7);
    lo = (lo + Math.imul(al8, bl8)) | 0;
    mid = (mid + Math.imul(al8, bh8)) | 0;
    mid = (mid + Math.imul(ah8, bl8)) | 0;
    hi = (hi + Math.imul(ah8, bh8)) | 0;
    lo = (lo + Math.imul(al7, bl9)) | 0;
    mid = (mid + Math.imul(al7, bh9)) | 0;
    mid = (mid + Math.imul(ah7, bl9)) | 0;
    hi = (hi + Math.imul(ah7, bh9)) | 0;
    var w16 = (((c + lo) | 0) + ((mid & 0x1fff) << 13)) | 0;
    c = (((hi + (mid >>> 13)) | 0) + (w16 >>> 26)) | 0;
    w16 &= 0x3ffffff;
    /* k = 17 */
    lo = Math.imul(al9, bl8);
    mid = Math.imul(al9, bh8);
    mid = (mid + Math.imul(ah9, bl8)) | 0;
    hi = Math.imul(ah9, bh8);
    lo = (lo + Math.imul(al8, bl9)) | 0;
    mid = (mid + Math.imul(al8, bh9)) | 0;
    mid = (mid + Math.imul(ah8, bl9)) | 0;
    hi = (hi + Math.imul(ah8, bh9)) | 0;
    var w17 = (((c + lo) | 0) + ((mid & 0x1fff) << 13)) | 0;
    c = (((hi + (mid >>> 13)) | 0) + (w17 >>> 26)) | 0;
    w17 &= 0x3ffffff;
    /* k = 18 */
    lo = Math.imul(al9, bl9);
    mid = Math.imul(al9, bh9);
    mid = (mid + Math.imul(ah9, bl9)) | 0;
    hi = Math.imul(ah9, bh9);
    var w18 = (((c + lo) | 0) + ((mid & 0x1fff) << 13)) | 0;
    c = (((hi + (mid >>> 13)) | 0) + (w18 >>> 26)) | 0;
    w18 &= 0x3ffffff;
    o[0] = w0;
    o[1] = w1;
    o[2] = w2;
    o[3] = w3;
    o[4] = w4;
    o[5] = w5;
    o[6] = w6;
    o[7] = w7;
    o[8] = w8;
    o[9] = w9;
    o[10] = w10;
    o[11] = w11;
    o[12] = w12;
    o[13] = w13;
    o[14] = w14;
    o[15] = w15;
    o[16] = w16;
    o[17] = w17;
    o[18] = w18;
    if (c !== 0) {
      o[19] = c;
      out.length++;
    }
    return out;
  };

  // Polyfill comb
  if (!Math.imul) {
    comb10MulTo = smallMulTo;
  }

  function bigMulTo (self, num, out) {
    out.negative = num.negative ^ self.negative;
    out.length = self.length + num.length;

    var carry = 0;
    var hncarry = 0;
    for (var k = 0; k < out.length - 1; k++) {
      // Sum all words with the same `i + j = k` and accumulate `ncarry`,
      // note that ncarry could be >= 0x3ffffff
      var ncarry = hncarry;
      hncarry = 0;
      var rword = carry & 0x3ffffff;
      var maxJ = Math.min(k, num.length - 1);
      for (var j = Math.max(0, k - self.length + 1); j <= maxJ; j++) {
        var i = k - j;
        var a = self.words[i] | 0;
        var b = num.words[j] | 0;
        var r = a * b;

        var lo = r & 0x3ffffff;
        ncarry = (ncarry + ((r / 0x4000000) | 0)) | 0;
        lo = (lo + rword) | 0;
        rword = lo & 0x3ffffff;
        ncarry = (ncarry + (lo >>> 26)) | 0;

        hncarry += ncarry >>> 26;
        ncarry &= 0x3ffffff;
      }
      out.words[k] = rword;
      carry = ncarry;
      ncarry = hncarry;
    }
    if (carry !== 0) {
      out.words[k] = carry;
    } else {
      out.length--;
    }

    return out.strip();
  }

  function jumboMulTo (self, num, out) {
    var fftm = new FFTM();
    return fftm.mulp(self, num, out);
  }

  BN.prototype.mulTo = function mulTo (num, out) {
    var res;
    var len = this.length + num.length;
    if (this.length === 10 && num.length === 10) {
      res = comb10MulTo(this, num, out);
    } else if (len < 63) {
      res = smallMulTo(this, num, out);
    } else if (len < 1024) {
      res = bigMulTo(this, num, out);
    } else {
      res = jumboMulTo(this, num, out);
    }

    return res;
  };

  // Cooley-Tukey algorithm for FFT
  // slightly revisited to rely on looping instead of recursion

  function FFTM (x, y) {
    this.x = x;
    this.y = y;
  }

  FFTM.prototype.makeRBT = function makeRBT (N) {
    var t = new Array(N);
    var l = BN.prototype._countBits(N) - 1;
    for (var i = 0; i < N; i++) {
      t[i] = this.revBin(i, l, N);
    }

    return t;
  };

  // Returns binary-reversed representation of `x`
  FFTM.prototype.revBin = function revBin (x, l, N) {
    if (x === 0 || x === N - 1) return x;

    var rb = 0;
    for (var i = 0; i < l; i++) {
      rb |= (x & 1) << (l - i - 1);
      x >>= 1;
    }

    return rb;
  };

  // Performs "tweedling" phase, therefore 'emulating'
  // behaviour of the recursive algorithm
  FFTM.prototype.permute = function permute (rbt, rws, iws, rtws, itws, N) {
    for (var i = 0; i < N; i++) {
      rtws[i] = rws[rbt[i]];
      itws[i] = iws[rbt[i]];
    }
  };

  FFTM.prototype.transform = function transform (rws, iws, rtws, itws, N, rbt) {
    this.permute(rbt, rws, iws, rtws, itws, N);

    for (var s = 1; s < N; s <<= 1) {
      var l = s << 1;

      var rtwdf = Math.cos(2 * Math.PI / l);
      var itwdf = Math.sin(2 * Math.PI / l);

      for (var p = 0; p < N; p += l) {
        var rtwdf_ = rtwdf;
        var itwdf_ = itwdf;

        for (var j = 0; j < s; j++) {
          var re = rtws[p + j];
          var ie = itws[p + j];

          var ro = rtws[p + j + s];
          var io = itws[p + j + s];

          var rx = rtwdf_ * ro - itwdf_ * io;

          io = rtwdf_ * io + itwdf_ * ro;
          ro = rx;

          rtws[p + j] = re + ro;
          itws[p + j] = ie + io;

          rtws[p + j + s] = re - ro;
          itws[p + j + s] = ie - io;

          /* jshint maxdepth : false */
          if (j !== l) {
            rx = rtwdf * rtwdf_ - itwdf * itwdf_;

            itwdf_ = rtwdf * itwdf_ + itwdf * rtwdf_;
            rtwdf_ = rx;
          }
        }
      }
    }
  };

  FFTM.prototype.guessLen13b = function guessLen13b (n, m) {
    var N = Math.max(m, n) | 1;
    var odd = N & 1;
    var i = 0;
    for (N = N / 2 | 0; N; N = N >>> 1) {
      i++;
    }

    return 1 << i + 1 + odd;
  };

  FFTM.prototype.conjugate = function conjugate (rws, iws, N) {
    if (N <= 1) return;

    for (var i = 0; i < N / 2; i++) {
      var t = rws[i];

      rws[i] = rws[N - i - 1];
      rws[N - i - 1] = t;

      t = iws[i];

      iws[i] = -iws[N - i - 1];
      iws[N - i - 1] = -t;
    }
  };

  FFTM.prototype.normalize13b = function normalize13b (ws, N) {
    var carry = 0;
    for (var i = 0; i < N / 2; i++) {
      var w = Math.round(ws[2 * i + 1] / N) * 0x2000 +
        Math.round(ws[2 * i] / N) +
        carry;

      ws[i] = w & 0x3ffffff;

      if (w < 0x4000000) {
        carry = 0;
      } else {
        carry = w / 0x4000000 | 0;
      }
    }

    return ws;
  };

  FFTM.prototype.convert13b = function convert13b (ws, len, rws, N) {
    var carry = 0;
    for (var i = 0; i < len; i++) {
      carry = carry + (ws[i] | 0);

      rws[2 * i] = carry & 0x1fff; carry = carry >>> 13;
      rws[2 * i + 1] = carry & 0x1fff; carry = carry >>> 13;
    }

    // Pad with zeroes
    for (i = 2 * len; i < N; ++i) {
      rws[i] = 0;
    }

    assert(carry === 0);
    assert((carry & ~0x1fff) === 0);
  };

  FFTM.prototype.stub = function stub (N) {
    var ph = new Array(N);
    for (var i = 0; i < N; i++) {
      ph[i] = 0;
    }

    return ph;
  };

  FFTM.prototype.mulp = function mulp (x, y, out) {
    var N = 2 * this.guessLen13b(x.length, y.length);

    var rbt = this.makeRBT(N);

    var _ = this.stub(N);

    var rws = new Array(N);
    var rwst = new Array(N);
    var iwst = new Array(N);

    var nrws = new Array(N);
    var nrwst = new Array(N);
    var niwst = new Array(N);

    var rmws = out.words;
    rmws.length = N;

    this.convert13b(x.words, x.length, rws, N);
    this.convert13b(y.words, y.length, nrws, N);

    this.transform(rws, _, rwst, iwst, N, rbt);
    this.transform(nrws, _, nrwst, niwst, N, rbt);

    for (var i = 0; i < N; i++) {
      var rx = rwst[i] * nrwst[i] - iwst[i] * niwst[i];
      iwst[i] = rwst[i] * niwst[i] + iwst[i] * nrwst[i];
      rwst[i] = rx;
    }

    this.conjugate(rwst, iwst, N);
    this.transform(rwst, iwst, rmws, _, N, rbt);
    this.conjugate(rmws, _, N);
    this.normalize13b(rmws, N);

    out.negative = x.negative ^ y.negative;
    out.length = x.length + y.length;
    return out.strip();
  };

  // Multiply `this` by `num`
  BN.prototype.mul = function mul (num) {
    var out = new BN(null);
    out.words = new Array(this.length + num.length);
    return this.mulTo(num, out);
  };

  // Multiply employing FFT
  BN.prototype.mulf = function mulf (num) {
    var out = new BN(null);
    out.words = new Array(this.length + num.length);
    return jumboMulTo(this, num, out);
  };

  // In-place Multiplication
  BN.prototype.imul = function imul (num) {
    return this.clone().mulTo(num, this);
  };

  BN.prototype.imuln = function imuln (num) {
    assert(typeof num === 'number');
    assert(num < 0x4000000);

    // Carry
    var carry = 0;
    for (var i = 0; i < this.length; i++) {
      var w = (this.words[i] | 0) * num;
      var lo = (w & 0x3ffffff) + (carry & 0x3ffffff);
      carry >>= 26;
      carry += (w / 0x4000000) | 0;
      // NOTE: lo is 27bit maximum
      carry += lo >>> 26;
      this.words[i] = lo & 0x3ffffff;
    }

    if (carry !== 0) {
      this.words[i] = carry;
      this.length++;
    }

    return this;
  };

  BN.prototype.muln = function muln (num) {
    return this.clone().imuln(num);
  };

  // `this` * `this`
  BN.prototype.sqr = function sqr () {
    return this.mul(this);
  };

  // `this` * `this` in-place
  BN.prototype.isqr = function isqr () {
    return this.imul(this.clone());
  };

  // Math.pow(`this`, `num`)
  BN.prototype.pow = function pow (num) {
    var w = toBitArray(num);
    if (w.length === 0) return new BN(1);

    // Skip leading zeroes
    var res = this;
    for (var i = 0; i < w.length; i++, res = res.sqr()) {
      if (w[i] !== 0) break;
    }

    if (++i < w.length) {
      for (var q = res.sqr(); i < w.length; i++, q = q.sqr()) {
        if (w[i] === 0) continue;

        res = res.mul(q);
      }
    }

    return res;
  };

  // Shift-left in-place
  BN.prototype.iushln = function iushln (bits) {
    assert(typeof bits === 'number' && bits >= 0);
    var r = bits % 26;
    var s = (bits - r) / 26;
    var carryMask = (0x3ffffff >>> (26 - r)) << (26 - r);
    var i;

    if (r !== 0) {
      var carry = 0;

      for (i = 0; i < this.length; i++) {
        var newCarry = this.words[i] & carryMask;
        var c = ((this.words[i] | 0) - newCarry) << r;
        this.words[i] = c | carry;
        carry = newCarry >>> (26 - r);
      }

      if (carry) {
        this.words[i] = carry;
        this.length++;
      }
    }

    if (s !== 0) {
      for (i = this.length - 1; i >= 0; i--) {
        this.words[i + s] = this.words[i];
      }

      for (i = 0; i < s; i++) {
        this.words[i] = 0;
      }

      this.length += s;
    }

    return this.strip();
  };

  BN.prototype.ishln = function ishln (bits) {
    // TODO(indutny): implement me
    assert(this.negative === 0);
    return this.iushln(bits);
  };

  // Shift-right in-place
  // NOTE: `hint` is a lowest bit before trailing zeroes
  // NOTE: if `extended` is present - it will be filled with destroyed bits
  BN.prototype.iushrn = function iushrn (bits, hint, extended) {
    assert(typeof bits === 'number' && bits >= 0);
    var h;
    if (hint) {
      h = (hint - (hint % 26)) / 26;
    } else {
      h = 0;
    }

    var r = bits % 26;
    var s = Math.min((bits - r) / 26, this.length);
    var mask = 0x3ffffff ^ ((0x3ffffff >>> r) << r);
    var maskedWords = extended;

    h -= s;
    h = Math.max(0, h);

    // Extended mode, copy masked part
    if (maskedWords) {
      for (var i = 0; i < s; i++) {
        maskedWords.words[i] = this.words[i];
      }
      maskedWords.length = s;
    }

    if (s === 0) ; else if (this.length > s) {
      this.length -= s;
      for (i = 0; i < this.length; i++) {
        this.words[i] = this.words[i + s];
      }
    } else {
      this.words[0] = 0;
      this.length = 1;
    }

    var carry = 0;
    for (i = this.length - 1; i >= 0 && (carry !== 0 || i >= h); i--) {
      var word = this.words[i] | 0;
      this.words[i] = (carry << (26 - r)) | (word >>> r);
      carry = word & mask;
    }

    // Push carried bits as a mask
    if (maskedWords && carry !== 0) {
      maskedWords.words[maskedWords.length++] = carry;
    }

    if (this.length === 0) {
      this.words[0] = 0;
      this.length = 1;
    }

    return this.strip();
  };

  BN.prototype.ishrn = function ishrn (bits, hint, extended) {
    // TODO(indutny): implement me
    assert(this.negative === 0);
    return this.iushrn(bits, hint, extended);
  };

  // Shift-left
  BN.prototype.shln = function shln (bits) {
    return this.clone().ishln(bits);
  };

  BN.prototype.ushln = function ushln (bits) {
    return this.clone().iushln(bits);
  };

  // Shift-right
  BN.prototype.shrn = function shrn (bits) {
    return this.clone().ishrn(bits);
  };

  BN.prototype.ushrn = function ushrn (bits) {
    return this.clone().iushrn(bits);
  };

  // Test if n bit is set
  BN.prototype.testn = function testn (bit) {
    assert(typeof bit === 'number' && bit >= 0);
    var r = bit % 26;
    var s = (bit - r) / 26;
    var q = 1 << r;

    // Fast case: bit is much higher than all existing words
    if (this.length <= s) return false;

    // Check bit and return
    var w = this.words[s];

    return !!(w & q);
  };

  // Return only lowers bits of number (in-place)
  BN.prototype.imaskn = function imaskn (bits) {
    assert(typeof bits === 'number' && bits >= 0);
    var r = bits % 26;
    var s = (bits - r) / 26;

    assert(this.negative === 0, 'imaskn works only with positive numbers');

    if (this.length <= s) {
      return this;
    }

    if (r !== 0) {
      s++;
    }
    this.length = Math.min(s, this.length);

    if (r !== 0) {
      var mask = 0x3ffffff ^ ((0x3ffffff >>> r) << r);
      this.words[this.length - 1] &= mask;
    }

    return this.strip();
  };

  // Return only lowers bits of number
  BN.prototype.maskn = function maskn (bits) {
    return this.clone().imaskn(bits);
  };

  // Add plain number `num` to `this`
  BN.prototype.iaddn = function iaddn (num) {
    assert(typeof num === 'number');
    assert(num < 0x4000000);
    if (num < 0) return this.isubn(-num);

    // Possible sign change
    if (this.negative !== 0) {
      if (this.length === 1 && (this.words[0] | 0) < num) {
        this.words[0] = num - (this.words[0] | 0);
        this.negative = 0;
        return this;
      }

      this.negative = 0;
      this.isubn(num);
      this.negative = 1;
      return this;
    }

    // Add without checks
    return this._iaddn(num);
  };

  BN.prototype._iaddn = function _iaddn (num) {
    this.words[0] += num;

    // Carry
    for (var i = 0; i < this.length && this.words[i] >= 0x4000000; i++) {
      this.words[i] -= 0x4000000;
      if (i === this.length - 1) {
        this.words[i + 1] = 1;
      } else {
        this.words[i + 1]++;
      }
    }
    this.length = Math.max(this.length, i + 1);

    return this;
  };

  // Subtract plain number `num` from `this`
  BN.prototype.isubn = function isubn (num) {
    assert(typeof num === 'number');
    assert(num < 0x4000000);
    if (num < 0) return this.iaddn(-num);

    if (this.negative !== 0) {
      this.negative = 0;
      this.iaddn(num);
      this.negative = 1;
      return this;
    }

    this.words[0] -= num;

    if (this.length === 1 && this.words[0] < 0) {
      this.words[0] = -this.words[0];
      this.negative = 1;
    } else {
      // Carry
      for (var i = 0; i < this.length && this.words[i] < 0; i++) {
        this.words[i] += 0x4000000;
        this.words[i + 1] -= 1;
      }
    }

    return this.strip();
  };

  BN.prototype.addn = function addn (num) {
    return this.clone().iaddn(num);
  };

  BN.prototype.subn = function subn (num) {
    return this.clone().isubn(num);
  };

  BN.prototype.iabs = function iabs () {
    this.negative = 0;

    return this;
  };

  BN.prototype.abs = function abs () {
    return this.clone().iabs();
  };

  BN.prototype._ishlnsubmul = function _ishlnsubmul (num, mul, shift) {
    var len = num.length + shift;
    var i;

    this._expand(len);

    var w;
    var carry = 0;
    for (i = 0; i < num.length; i++) {
      w = (this.words[i + shift] | 0) + carry;
      var right = (num.words[i] | 0) * mul;
      w -= right & 0x3ffffff;
      carry = (w >> 26) - ((right / 0x4000000) | 0);
      this.words[i + shift] = w & 0x3ffffff;
    }
    for (; i < this.length - shift; i++) {
      w = (this.words[i + shift] | 0) + carry;
      carry = w >> 26;
      this.words[i + shift] = w & 0x3ffffff;
    }

    if (carry === 0) return this.strip();

    // Subtraction overflow
    assert(carry === -1);
    carry = 0;
    for (i = 0; i < this.length; i++) {
      w = -(this.words[i] | 0) + carry;
      carry = w >> 26;
      this.words[i] = w & 0x3ffffff;
    }
    this.negative = 1;

    return this.strip();
  };

  BN.prototype._wordDiv = function _wordDiv (num, mode) {
    var shift = this.length - num.length;

    var a = this.clone();
    var b = num;

    // Normalize
    var bhi = b.words[b.length - 1] | 0;
    var bhiBits = this._countBits(bhi);
    shift = 26 - bhiBits;
    if (shift !== 0) {
      b = b.ushln(shift);
      a.iushln(shift);
      bhi = b.words[b.length - 1] | 0;
    }

    // Initialize quotient
    var m = a.length - b.length;
    var q;

    if (mode !== 'mod') {
      q = new BN(null);
      q.length = m + 1;
      q.words = new Array(q.length);
      for (var i = 0; i < q.length; i++) {
        q.words[i] = 0;
      }
    }

    var diff = a.clone()._ishlnsubmul(b, 1, m);
    if (diff.negative === 0) {
      a = diff;
      if (q) {
        q.words[m] = 1;
      }
    }

    for (var j = m - 1; j >= 0; j--) {
      var qj = (a.words[b.length + j] | 0) * 0x4000000 +
        (a.words[b.length + j - 1] | 0);

      // NOTE: (qj / bhi) is (0x3ffffff * 0x4000000 + 0x3ffffff) / 0x2000000 max
      // (0x7ffffff)
      qj = Math.min((qj / bhi) | 0, 0x3ffffff);

      a._ishlnsubmul(b, qj, j);
      while (a.negative !== 0) {
        qj--;
        a.negative = 0;
        a._ishlnsubmul(b, 1, j);
        if (!a.isZero()) {
          a.negative ^= 1;
        }
      }
      if (q) {
        q.words[j] = qj;
      }
    }
    if (q) {
      q.strip();
    }
    a.strip();

    // Denormalize
    if (mode !== 'div' && shift !== 0) {
      a.iushrn(shift);
    }

    return {
      div: q || null,
      mod: a
    };
  };

  // NOTE: 1) `mode` can be set to `mod` to request mod only,
  //       to `div` to request div only, or be absent to
  //       request both div & mod
  //       2) `positive` is true if unsigned mod is requested
  BN.prototype.divmod = function divmod (num, mode, positive) {
    assert(!num.isZero());

    if (this.isZero()) {
      return {
        div: new BN(0),
        mod: new BN(0)
      };
    }

    var div, mod, res;
    if (this.negative !== 0 && num.negative === 0) {
      res = this.neg().divmod(num, mode);

      if (mode !== 'mod') {
        div = res.div.neg();
      }

      if (mode !== 'div') {
        mod = res.mod.neg();
        if (positive && mod.negative !== 0) {
          mod.iadd(num);
        }
      }

      return {
        div: div,
        mod: mod
      };
    }

    if (this.negative === 0 && num.negative !== 0) {
      res = this.divmod(num.neg(), mode);

      if (mode !== 'mod') {
        div = res.div.neg();
      }

      return {
        div: div,
        mod: res.mod
      };
    }

    if ((this.negative & num.negative) !== 0) {
      res = this.neg().divmod(num.neg(), mode);

      if (mode !== 'div') {
        mod = res.mod.neg();
        if (positive && mod.negative !== 0) {
          mod.isub(num);
        }
      }

      return {
        div: res.div,
        mod: mod
      };
    }

    // Both numbers are positive at this point

    // Strip both numbers to approximate shift value
    if (num.length > this.length || this.cmp(num) < 0) {
      return {
        div: new BN(0),
        mod: this
      };
    }

    // Very short reduction
    if (num.length === 1) {
      if (mode === 'div') {
        return {
          div: this.divn(num.words[0]),
          mod: null
        };
      }

      if (mode === 'mod') {
        return {
          div: null,
          mod: new BN(this.modn(num.words[0]))
        };
      }

      return {
        div: this.divn(num.words[0]),
        mod: new BN(this.modn(num.words[0]))
      };
    }

    return this._wordDiv(num, mode);
  };

  // Find `this` / `num`
  BN.prototype.div = function div (num) {
    return this.divmod(num, 'div', false).div;
  };

  // Find `this` % `num`
  BN.prototype.mod = function mod (num) {
    return this.divmod(num, 'mod', false).mod;
  };

  BN.prototype.umod = function umod (num) {
    return this.divmod(num, 'mod', true).mod;
  };

  // Find Round(`this` / `num`)
  BN.prototype.divRound = function divRound (num) {
    var dm = this.divmod(num);

    // Fast case - exact division
    if (dm.mod.isZero()) return dm.div;

    var mod = dm.div.negative !== 0 ? dm.mod.isub(num) : dm.mod;

    var half = num.ushrn(1);
    var r2 = num.andln(1);
    var cmp = mod.cmp(half);

    // Round down
    if (cmp < 0 || r2 === 1 && cmp === 0) return dm.div;

    // Round up
    return dm.div.negative !== 0 ? dm.div.isubn(1) : dm.div.iaddn(1);
  };

  BN.prototype.modn = function modn (num) {
    assert(num <= 0x3ffffff);
    var p = (1 << 26) % num;

    var acc = 0;
    for (var i = this.length - 1; i >= 0; i--) {
      acc = (p * acc + (this.words[i] | 0)) % num;
    }

    return acc;
  };

  // In-place division by number
  BN.prototype.idivn = function idivn (num) {
    assert(num <= 0x3ffffff);

    var carry = 0;
    for (var i = this.length - 1; i >= 0; i--) {
      var w = (this.words[i] | 0) + carry * 0x4000000;
      this.words[i] = (w / num) | 0;
      carry = w % num;
    }

    return this.strip();
  };

  BN.prototype.divn = function divn (num) {
    return this.clone().idivn(num);
  };

  BN.prototype.egcd = function egcd (p) {
    assert(p.negative === 0);
    assert(!p.isZero());

    var x = this;
    var y = p.clone();

    if (x.negative !== 0) {
      x = x.umod(p);
    } else {
      x = x.clone();
    }

    // A * x + B * y = x
    var A = new BN(1);
    var B = new BN(0);

    // C * x + D * y = y
    var C = new BN(0);
    var D = new BN(1);

    var g = 0;

    while (x.isEven() && y.isEven()) {
      x.iushrn(1);
      y.iushrn(1);
      ++g;
    }

    var yp = y.clone();
    var xp = x.clone();

    while (!x.isZero()) {
      for (var i = 0, im = 1; (x.words[0] & im) === 0 && i < 26; ++i, im <<= 1);
      if (i > 0) {
        x.iushrn(i);
        while (i-- > 0) {
          if (A.isOdd() || B.isOdd()) {
            A.iadd(yp);
            B.isub(xp);
          }

          A.iushrn(1);
          B.iushrn(1);
        }
      }

      for (var j = 0, jm = 1; (y.words[0] & jm) === 0 && j < 26; ++j, jm <<= 1);
      if (j > 0) {
        y.iushrn(j);
        while (j-- > 0) {
          if (C.isOdd() || D.isOdd()) {
            C.iadd(yp);
            D.isub(xp);
          }

          C.iushrn(1);
          D.iushrn(1);
        }
      }

      if (x.cmp(y) >= 0) {
        x.isub(y);
        A.isub(C);
        B.isub(D);
      } else {
        y.isub(x);
        C.isub(A);
        D.isub(B);
      }
    }

    return {
      a: C,
      b: D,
      gcd: y.iushln(g)
    };
  };

  // This is reduced incarnation of the binary EEA
  // above, designated to invert members of the
  // _prime_ fields F(p) at a maximal speed
  BN.prototype._invmp = function _invmp (p) {
    assert(p.negative === 0);
    assert(!p.isZero());

    var a = this;
    var b = p.clone();

    if (a.negative !== 0) {
      a = a.umod(p);
    } else {
      a = a.clone();
    }

    var x1 = new BN(1);
    var x2 = new BN(0);

    var delta = b.clone();

    while (a.cmpn(1) > 0 && b.cmpn(1) > 0) {
      for (var i = 0, im = 1; (a.words[0] & im) === 0 && i < 26; ++i, im <<= 1);
      if (i > 0) {
        a.iushrn(i);
        while (i-- > 0) {
          if (x1.isOdd()) {
            x1.iadd(delta);
          }

          x1.iushrn(1);
        }
      }

      for (var j = 0, jm = 1; (b.words[0] & jm) === 0 && j < 26; ++j, jm <<= 1);
      if (j > 0) {
        b.iushrn(j);
        while (j-- > 0) {
          if (x2.isOdd()) {
            x2.iadd(delta);
          }

          x2.iushrn(1);
        }
      }

      if (a.cmp(b) >= 0) {
        a.isub(b);
        x1.isub(x2);
      } else {
        b.isub(a);
        x2.isub(x1);
      }
    }

    var res;
    if (a.cmpn(1) === 0) {
      res = x1;
    } else {
      res = x2;
    }

    if (res.cmpn(0) < 0) {
      res.iadd(p);
    }

    return res;
  };

  BN.prototype.gcd = function gcd (num) {
    if (this.isZero()) return num.abs();
    if (num.isZero()) return this.abs();

    var a = this.clone();
    var b = num.clone();
    a.negative = 0;
    b.negative = 0;

    // Remove common factor of two
    for (var shift = 0; a.isEven() && b.isEven(); shift++) {
      a.iushrn(1);
      b.iushrn(1);
    }

    do {
      while (a.isEven()) {
        a.iushrn(1);
      }
      while (b.isEven()) {
        b.iushrn(1);
      }

      var r = a.cmp(b);
      if (r < 0) {
        // Swap `a` and `b` to make `a` always bigger than `b`
        var t = a;
        a = b;
        b = t;
      } else if (r === 0 || b.cmpn(1) === 0) {
        break;
      }

      a.isub(b);
    } while (true);

    return b.iushln(shift);
  };

  // Invert number in the field F(num)
  BN.prototype.invm = function invm (num) {
    return this.egcd(num).a.umod(num);
  };

  BN.prototype.isEven = function isEven () {
    return (this.words[0] & 1) === 0;
  };

  BN.prototype.isOdd = function isOdd () {
    return (this.words[0] & 1) === 1;
  };

  // And first word and num
  BN.prototype.andln = function andln (num) {
    return this.words[0] & num;
  };

  // Increment at the bit position in-line
  BN.prototype.bincn = function bincn (bit) {
    assert(typeof bit === 'number');
    var r = bit % 26;
    var s = (bit - r) / 26;
    var q = 1 << r;

    // Fast case: bit is much higher than all existing words
    if (this.length <= s) {
      this._expand(s + 1);
      this.words[s] |= q;
      return this;
    }

    // Add bit and propagate, if needed
    var carry = q;
    for (var i = s; carry !== 0 && i < this.length; i++) {
      var w = this.words[i] | 0;
      w += carry;
      carry = w >>> 26;
      w &= 0x3ffffff;
      this.words[i] = w;
    }
    if (carry !== 0) {
      this.words[i] = carry;
      this.length++;
    }
    return this;
  };

  BN.prototype.isZero = function isZero () {
    return this.length === 1 && this.words[0] === 0;
  };

  BN.prototype.cmpn = function cmpn (num) {
    var negative = num < 0;

    if (this.negative !== 0 && !negative) return -1;
    if (this.negative === 0 && negative) return 1;

    this.strip();

    var res;
    if (this.length > 1) {
      res = 1;
    } else {
      if (negative) {
        num = -num;
      }

      assert(num <= 0x3ffffff, 'Number is too big');

      var w = this.words[0] | 0;
      res = w === num ? 0 : w < num ? -1 : 1;
    }
    if (this.negative !== 0) return -res | 0;
    return res;
  };

  // Compare two numbers and return:
  // 1 - if `this` > `num`
  // 0 - if `this` == `num`
  // -1 - if `this` < `num`
  BN.prototype.cmp = function cmp (num) {
    if (this.negative !== 0 && num.negative === 0) return -1;
    if (this.negative === 0 && num.negative !== 0) return 1;

    var res = this.ucmp(num);
    if (this.negative !== 0) return -res | 0;
    return res;
  };

  // Unsigned comparison
  BN.prototype.ucmp = function ucmp (num) {
    // At this point both numbers have the same sign
    if (this.length > num.length) return 1;
    if (this.length < num.length) return -1;

    var res = 0;
    for (var i = this.length - 1; i >= 0; i--) {
      var a = this.words[i] | 0;
      var b = num.words[i] | 0;

      if (a === b) continue;
      if (a < b) {
        res = -1;
      } else if (a > b) {
        res = 1;
      }
      break;
    }
    return res;
  };

  BN.prototype.gtn = function gtn (num) {
    return this.cmpn(num) === 1;
  };

  BN.prototype.gt = function gt (num) {
    return this.cmp(num) === 1;
  };

  BN.prototype.gten = function gten (num) {
    return this.cmpn(num) >= 0;
  };

  BN.prototype.gte = function gte (num) {
    return this.cmp(num) >= 0;
  };

  BN.prototype.ltn = function ltn (num) {
    return this.cmpn(num) === -1;
  };

  BN.prototype.lt = function lt (num) {
    return this.cmp(num) === -1;
  };

  BN.prototype.lten = function lten (num) {
    return this.cmpn(num) <= 0;
  };

  BN.prototype.lte = function lte (num) {
    return this.cmp(num) <= 0;
  };

  BN.prototype.eqn = function eqn (num) {
    return this.cmpn(num) === 0;
  };

  BN.prototype.eq = function eq (num) {
    return this.cmp(num) === 0;
  };

  //
  // A reduce context, could be using montgomery or something better, depending
  // on the `m` itself.
  //
  BN.red = function red (num) {
    return new Red(num);
  };

  BN.prototype.toRed = function toRed (ctx) {
    assert(!this.red, 'Already a number in reduction context');
    assert(this.negative === 0, 'red works only with positives');
    return ctx.convertTo(this)._forceRed(ctx);
  };

  BN.prototype.fromRed = function fromRed () {
    assert(this.red, 'fromRed works only with numbers in reduction context');
    return this.red.convertFrom(this);
  };

  BN.prototype._forceRed = function _forceRed (ctx) {
    this.red = ctx;
    return this;
  };

  BN.prototype.forceRed = function forceRed (ctx) {
    assert(!this.red, 'Already a number in reduction context');
    return this._forceRed(ctx);
  };

  BN.prototype.redAdd = function redAdd (num) {
    assert(this.red, 'redAdd works only with red numbers');
    return this.red.add(this, num);
  };

  BN.prototype.redIAdd = function redIAdd (num) {
    assert(this.red, 'redIAdd works only with red numbers');
    return this.red.iadd(this, num);
  };

  BN.prototype.redSub = function redSub (num) {
    assert(this.red, 'redSub works only with red numbers');
    return this.red.sub(this, num);
  };

  BN.prototype.redISub = function redISub (num) {
    assert(this.red, 'redISub works only with red numbers');
    return this.red.isub(this, num);
  };

  BN.prototype.redShl = function redShl (num) {
    assert(this.red, 'redShl works only with red numbers');
    return this.red.shl(this, num);
  };

  BN.prototype.redMul = function redMul (num) {
    assert(this.red, 'redMul works only with red numbers');
    this.red._verify2(this, num);
    return this.red.mul(this, num);
  };

  BN.prototype.redIMul = function redIMul (num) {
    assert(this.red, 'redMul works only with red numbers');
    this.red._verify2(this, num);
    return this.red.imul(this, num);
  };

  BN.prototype.redSqr = function redSqr () {
    assert(this.red, 'redSqr works only with red numbers');
    this.red._verify1(this);
    return this.red.sqr(this);
  };

  BN.prototype.redISqr = function redISqr () {
    assert(this.red, 'redISqr works only with red numbers');
    this.red._verify1(this);
    return this.red.isqr(this);
  };

  // Square root over p
  BN.prototype.redSqrt = function redSqrt () {
    assert(this.red, 'redSqrt works only with red numbers');
    this.red._verify1(this);
    return this.red.sqrt(this);
  };

  BN.prototype.redInvm = function redInvm () {
    assert(this.red, 'redInvm works only with red numbers');
    this.red._verify1(this);
    return this.red.invm(this);
  };

  // Return negative clone of `this` % `red modulo`
  BN.prototype.redNeg = function redNeg () {
    assert(this.red, 'redNeg works only with red numbers');
    this.red._verify1(this);
    return this.red.neg(this);
  };

  BN.prototype.redPow = function redPow (num) {
    assert(this.red && !num.red, 'redPow(normalNum)');
    this.red._verify1(this);
    return this.red.pow(this, num);
  };

  // Prime numbers with efficient reduction
  var primes = {
    k256: null,
    p224: null,
    p192: null,
    p25519: null
  };

  // Pseudo-Mersenne prime
  function MPrime (name, p) {
    // P = 2 ^ N - K
    this.name = name;
    this.p = new BN(p, 16);
    this.n = this.p.bitLength();
    this.k = new BN(1).iushln(this.n).isub(this.p);

    this.tmp = this._tmp();
  }

  MPrime.prototype._tmp = function _tmp () {
    var tmp = new BN(null);
    tmp.words = new Array(Math.ceil(this.n / 13));
    return tmp;
  };

  MPrime.prototype.ireduce = function ireduce (num) {
    // Assumes that `num` is less than `P^2`
    // num = HI * (2 ^ N - K) + HI * K + LO = HI * K + LO (mod P)
    var r = num;
    var rlen;

    do {
      this.split(r, this.tmp);
      r = this.imulK(r);
      r = r.iadd(this.tmp);
      rlen = r.bitLength();
    } while (rlen > this.n);

    var cmp = rlen < this.n ? -1 : r.ucmp(this.p);
    if (cmp === 0) {
      r.words[0] = 0;
      r.length = 1;
    } else if (cmp > 0) {
      r.isub(this.p);
    } else {
      r.strip();
    }

    return r;
  };

  MPrime.prototype.split = function split (input, out) {
    input.iushrn(this.n, 0, out);
  };

  MPrime.prototype.imulK = function imulK (num) {
    return num.imul(this.k);
  };

  function K256 () {
    MPrime.call(
      this,
      'k256',
      'ffffffff ffffffff ffffffff ffffffff ffffffff ffffffff fffffffe fffffc2f');
  }
  inherits(K256, MPrime);

  K256.prototype.split = function split (input, output) {
    // 256 = 9 * 26 + 22
    var mask = 0x3fffff;

    var outLen = Math.min(input.length, 9);
    for (var i = 0; i < outLen; i++) {
      output.words[i] = input.words[i];
    }
    output.length = outLen;

    if (input.length <= 9) {
      input.words[0] = 0;
      input.length = 1;
      return;
    }

    // Shift by 9 limbs
    var prev = input.words[9];
    output.words[output.length++] = prev & mask;

    for (i = 10; i < input.length; i++) {
      var next = input.words[i] | 0;
      input.words[i - 10] = ((next & mask) << 4) | (prev >>> 22);
      prev = next;
    }
    prev >>>= 22;
    input.words[i - 10] = prev;
    if (prev === 0 && input.length > 10) {
      input.length -= 10;
    } else {
      input.length -= 9;
    }
  };

  K256.prototype.imulK = function imulK (num) {
    // K = 0x1000003d1 = [ 0x40, 0x3d1 ]
    num.words[num.length] = 0;
    num.words[num.length + 1] = 0;
    num.length += 2;

    // bounded at: 0x40 * 0x3ffffff + 0x3d0 = 0x100000390
    var lo = 0;
    for (var i = 0; i < num.length; i++) {
      var w = num.words[i] | 0;
      lo += w * 0x3d1;
      num.words[i] = lo & 0x3ffffff;
      lo = w * 0x40 + ((lo / 0x4000000) | 0);
    }

    // Fast length reduction
    if (num.words[num.length - 1] === 0) {
      num.length--;
      if (num.words[num.length - 1] === 0) {
        num.length--;
      }
    }
    return num;
  };

  function P224 () {
    MPrime.call(
      this,
      'p224',
      'ffffffff ffffffff ffffffff ffffffff 00000000 00000000 00000001');
  }
  inherits(P224, MPrime);

  function P192 () {
    MPrime.call(
      this,
      'p192',
      'ffffffff ffffffff ffffffff fffffffe ffffffff ffffffff');
  }
  inherits(P192, MPrime);

  function P25519 () {
    // 2 ^ 255 - 19
    MPrime.call(
      this,
      '25519',
      '7fffffffffffffff ffffffffffffffff ffffffffffffffff ffffffffffffffed');
  }
  inherits(P25519, MPrime);

  P25519.prototype.imulK = function imulK (num) {
    // K = 0x13
    var carry = 0;
    for (var i = 0; i < num.length; i++) {
      var hi = (num.words[i] | 0) * 0x13 + carry;
      var lo = hi & 0x3ffffff;
      hi >>>= 26;

      num.words[i] = lo;
      carry = hi;
    }
    if (carry !== 0) {
      num.words[num.length++] = carry;
    }
    return num;
  };

  // Exported mostly for testing purposes, use plain name instead
  BN._prime = function prime (name) {
    // Cached version of prime
    if (primes[name]) return primes[name];

    var prime;
    if (name === 'k256') {
      prime = new K256();
    } else if (name === 'p224') {
      prime = new P224();
    } else if (name === 'p192') {
      prime = new P192();
    } else if (name === 'p25519') {
      prime = new P25519();
    } else {
      throw new Error('Unknown prime ' + name);
    }
    primes[name] = prime;

    return prime;
  };

  //
  // Base reduction engine
  //
  function Red (m) {
    if (typeof m === 'string') {
      var prime = BN._prime(m);
      this.m = prime.p;
      this.prime = prime;
    } else {
      assert(m.gtn(1), 'modulus must be greater than 1');
      this.m = m;
      this.prime = null;
    }
  }

  Red.prototype._verify1 = function _verify1 (a) {
    assert(a.negative === 0, 'red works only with positives');
    assert(a.red, 'red works only with red numbers');
  };

  Red.prototype._verify2 = function _verify2 (a, b) {
    assert((a.negative | b.negative) === 0, 'red works only with positives');
    assert(a.red && a.red === b.red,
      'red works only with red numbers');
  };

  Red.prototype.imod = function imod (a) {
    if (this.prime) return this.prime.ireduce(a)._forceRed(this);
    return a.umod(this.m)._forceRed(this);
  };

  Red.prototype.neg = function neg (a) {
    if (a.isZero()) {
      return a.clone();
    }

    return this.m.sub(a)._forceRed(this);
  };

  Red.prototype.add = function add (a, b) {
    this._verify2(a, b);

    var res = a.add(b);
    if (res.cmp(this.m) >= 0) {
      res.isub(this.m);
    }
    return res._forceRed(this);
  };

  Red.prototype.iadd = function iadd (a, b) {
    this._verify2(a, b);

    var res = a.iadd(b);
    if (res.cmp(this.m) >= 0) {
      res.isub(this.m);
    }
    return res;
  };

  Red.prototype.sub = function sub (a, b) {
    this._verify2(a, b);

    var res = a.sub(b);
    if (res.cmpn(0) < 0) {
      res.iadd(this.m);
    }
    return res._forceRed(this);
  };

  Red.prototype.isub = function isub (a, b) {
    this._verify2(a, b);

    var res = a.isub(b);
    if (res.cmpn(0) < 0) {
      res.iadd(this.m);
    }
    return res;
  };

  Red.prototype.shl = function shl (a, num) {
    this._verify1(a);
    return this.imod(a.ushln(num));
  };

  Red.prototype.imul = function imul (a, b) {
    this._verify2(a, b);
    return this.imod(a.imul(b));
  };

  Red.prototype.mul = function mul (a, b) {
    this._verify2(a, b);
    return this.imod(a.mul(b));
  };

  Red.prototype.isqr = function isqr (a) {
    return this.imul(a, a.clone());
  };

  Red.prototype.sqr = function sqr (a) {
    return this.mul(a, a);
  };

  Red.prototype.sqrt = function sqrt (a) {
    if (a.isZero()) return a.clone();

    var mod3 = this.m.andln(3);
    assert(mod3 % 2 === 1);

    // Fast case
    if (mod3 === 3) {
      var pow = this.m.add(new BN(1)).iushrn(2);
      return this.pow(a, pow);
    }

    // Tonelli-Shanks algorithm (Totally unoptimized and slow)
    //
    // Find Q and S, that Q * 2 ^ S = (P - 1)
    var q = this.m.subn(1);
    var s = 0;
    while (!q.isZero() && q.andln(1) === 0) {
      s++;
      q.iushrn(1);
    }
    assert(!q.isZero());

    var one = new BN(1).toRed(this);
    var nOne = one.redNeg();

    // Find quadratic non-residue
    // NOTE: Max is such because of generalized Riemann hypothesis.
    var lpow = this.m.subn(1).iushrn(1);
    var z = this.m.bitLength();
    z = new BN(2 * z * z).toRed(this);

    while (this.pow(z, lpow).cmp(nOne) !== 0) {
      z.redIAdd(nOne);
    }

    var c = this.pow(z, q);
    var r = this.pow(a, q.addn(1).iushrn(1));
    var t = this.pow(a, q);
    var m = s;
    while (t.cmp(one) !== 0) {
      var tmp = t;
      for (var i = 0; tmp.cmp(one) !== 0; i++) {
        tmp = tmp.redSqr();
      }
      assert(i < m);
      var b = this.pow(c, new BN(1).iushln(m - i - 1));

      r = r.redMul(b);
      c = b.redSqr();
      t = t.redMul(c);
      m = i;
    }

    return r;
  };

  Red.prototype.invm = function invm (a) {
    var inv = a._invmp(this.m);
    if (inv.negative !== 0) {
      inv.negative = 0;
      return this.imod(inv).redNeg();
    } else {
      return this.imod(inv);
    }
  };

  Red.prototype.pow = function pow (a, num) {
    if (num.isZero()) return new BN(1).toRed(this);
    if (num.cmpn(1) === 0) return a.clone();

    var windowSize = 4;
    var wnd = new Array(1 << windowSize);
    wnd[0] = new BN(1).toRed(this);
    wnd[1] = a;
    for (var i = 2; i < wnd.length; i++) {
      wnd[i] = this.mul(wnd[i - 1], a);
    }

    var res = wnd[0];
    var current = 0;
    var currentLen = 0;
    var start = num.bitLength() % 26;
    if (start === 0) {
      start = 26;
    }

    for (i = num.length - 1; i >= 0; i--) {
      var word = num.words[i];
      for (var j = start - 1; j >= 0; j--) {
        var bit = (word >> j) & 1;
        if (res !== wnd[0]) {
          res = this.sqr(res);
        }

        if (bit === 0 && current === 0) {
          currentLen = 0;
          continue;
        }

        current <<= 1;
        current |= bit;
        currentLen++;
        if (currentLen !== windowSize && (i !== 0 || j !== 0)) continue;

        res = this.mul(res, wnd[current]);
        currentLen = 0;
        current = 0;
      }
      start = 26;
    }

    return res;
  };

  Red.prototype.convertTo = function convertTo (num) {
    var r = num.umod(this.m);

    return r === num ? r.clone() : r;
  };

  Red.prototype.convertFrom = function convertFrom (num) {
    var res = num.clone();
    res.red = null;
    return res;
  };

  //
  // Montgomery method engine
  //

  BN.mont = function mont (num) {
    return new Mont(num);
  };

  function Mont (m) {
    Red.call(this, m);

    this.shift = this.m.bitLength();
    if (this.shift % 26 !== 0) {
      this.shift += 26 - (this.shift % 26);
    }

    this.r = new BN(1).iushln(this.shift);
    this.r2 = this.imod(this.r.sqr());
    this.rinv = this.r._invmp(this.m);

    this.minv = this.rinv.mul(this.r).isubn(1).div(this.m);
    this.minv = this.minv.umod(this.r);
    this.minv = this.r.sub(this.minv);
  }
  inherits(Mont, Red);

  Mont.prototype.convertTo = function convertTo (num) {
    return this.imod(num.ushln(this.shift));
  };

  Mont.prototype.convertFrom = function convertFrom (num) {
    var r = this.imod(num.mul(this.rinv));
    r.red = null;
    return r;
  };

  Mont.prototype.imul = function imul (a, b) {
    if (a.isZero() || b.isZero()) {
      a.words[0] = 0;
      a.length = 1;
      return a;
    }

    var t = a.imul(b);
    var c = t.maskn(this.shift).mul(this.minv).imaskn(this.shift).mul(this.m);
    var u = t.isub(c).iushrn(this.shift);
    var res = u;

    if (u.cmp(this.m) >= 0) {
      res = u.isub(this.m);
    } else if (u.cmpn(0) < 0) {
      res = u.iadd(this.m);
    }

    return res._forceRed(this);
  };

  Mont.prototype.mul = function mul (a, b) {
    if (a.isZero() || b.isZero()) return new BN(0)._forceRed(this);

    var t = a.mul(b);
    var c = t.maskn(this.shift).mul(this.minv).imaskn(this.shift).mul(this.m);
    var u = t.isub(c).iushrn(this.shift);
    var res = u;
    if (u.cmp(this.m) >= 0) {
      res = u.isub(this.m);
    } else if (u.cmpn(0) < 0) {
      res = u.iadd(this.m);
    }

    return res._forceRed(this);
  };

  Mont.prototype.invm = function invm (a) {
    // (AR)^-1 * R^2 = (A^-1 * R^-1) * R^2 = A^-1 * R
    var res = this.imod(a._invmp(this.m).mul(this.r2));
    return res._forceRed(this);
  };
})(module, commonjsGlobal);
});

var isBn = isBN;

//Test if x is a bignumber
//FIXME: obviously this is the wrong way to do it
function isBN(x) {
  return x && typeof x === 'object' && Boolean(x.words)
}

var isRat_1 = isRat;

function isRat(x) {
  return Array.isArray(x) && x.length === 2 && isBn(x[0]) && isBn(x[1])
}

var double_1 = createCommonjsModule(function (module) {
var hasTypedArrays = false;
if(typeof Float64Array !== "undefined") {
  var DOUBLE_VIEW = new Float64Array(1)
    , UINT_VIEW   = new Uint32Array(DOUBLE_VIEW.buffer);
  DOUBLE_VIEW[0] = 1.0;
  hasTypedArrays = true;
  if(UINT_VIEW[1] === 0x3ff00000) {
    //Use little endian
    module.exports = function doubleBitsLE(n) {
      DOUBLE_VIEW[0] = n;
      return [ UINT_VIEW[0], UINT_VIEW[1] ]
    };
    function toDoubleLE(lo, hi) {
      UINT_VIEW[0] = lo;
      UINT_VIEW[1] = hi;
      return DOUBLE_VIEW[0]
    }
    module.exports.pack = toDoubleLE;
    function lowUintLE(n) {
      DOUBLE_VIEW[0] = n;
      return UINT_VIEW[0]
    }
    module.exports.lo = lowUintLE;
    function highUintLE(n) {
      DOUBLE_VIEW[0] = n;
      return UINT_VIEW[1]
    }
    module.exports.hi = highUintLE;
  } else if(UINT_VIEW[0] === 0x3ff00000) {
    //Use big endian
    module.exports = function doubleBitsBE(n) {
      DOUBLE_VIEW[0] = n;
      return [ UINT_VIEW[1], UINT_VIEW[0] ]
    };
    function toDoubleBE(lo, hi) {
      UINT_VIEW[1] = lo;
      UINT_VIEW[0] = hi;
      return DOUBLE_VIEW[0]
    }
    module.exports.pack = toDoubleBE;
    function lowUintBE(n) {
      DOUBLE_VIEW[0] = n;
      return UINT_VIEW[1]
    }
    module.exports.lo = lowUintBE;
    function highUintBE(n) {
      DOUBLE_VIEW[0] = n;
      return UINT_VIEW[0]
    }
    module.exports.hi = highUintBE;
  } else {
    hasTypedArrays = false;
  }
}
if(!hasTypedArrays) {
  var buffer = new Buffer(8);
  module.exports = function doubleBits(n) {
    buffer.writeDoubleLE(n, 0, true);
    return [ buffer.readUInt32LE(0, true), buffer.readUInt32LE(4, true) ]
  };
  function toDouble(lo, hi) {
    buffer.writeUInt32LE(lo, 0, true);
    buffer.writeUInt32LE(hi, 4, true);
    return buffer.readDoubleLE(0, true)
  }
  module.exports.pack = toDouble;  
  function lowUint(n) {
    buffer.writeDoubleLE(n, 0, true);
    return buffer.readUInt32LE(0, true)
  }
  module.exports.lo = lowUint;
  function highUint(n) {
    buffer.writeDoubleLE(n, 0, true);
    return buffer.readUInt32LE(4, true)
  }
  module.exports.hi = highUint;
}

module.exports.sign = function(n) {
  return module.exports.hi(n) >>> 31
};

module.exports.exponent = function(n) {
  var b = module.exports.hi(n);
  return ((b<<1) >>> 21) - 1023
};

module.exports.fraction = function(n) {
  var lo = module.exports.lo(n);
  var hi = module.exports.hi(n);
  var b = hi & ((1<<20) - 1);
  if(hi & 0x7ff00000) {
    b += (1<<20);
  }
  return [lo, b]
};

module.exports.denormalized = function(n) {
  var hi = module.exports.hi(n);
  return !(hi & 0x7ff00000)
};
});
var double_2 = double_1.pack;
var double_3 = double_1.lo;
var double_4 = double_1.hi;
var double_5 = double_1.sign;
var double_6 = double_1.exponent;
var double_7 = double_1.fraction;
var double_8 = double_1.denormalized;

var numToBn = num2bn;

function num2bn(x) {
  var e = double_1.exponent(x);
  if(e < 52) {
    return new bn(x)
  } else {
    return (new bn(x * Math.pow(2, 52-e))).ushln(e-52)
  }
}

var strToBn = str2BN;

function str2BN(x) {
  return new bn(x)
}

var bnSign = sign$1;

function sign$1 (x) {
  return x.cmp(new bn(0))
}

var rationalize_1 = rationalize;

function rationalize(numer, denom) {
  var snumer = bnSign(numer);
  var sdenom = bnSign(denom);
  if(snumer === 0) {
    return [numToBn(0), numToBn(1)]
  }
  if(sdenom === 0) {
    return [numToBn(0), numToBn(0)]
  }
  if(sdenom < 0) {
    numer = numer.neg();
    denom = denom.neg();
  }
  var d = numer.gcd(denom);
  if(d.cmpn(1)) {
    return [ numer.div(d), denom.div(d) ]
  }
  return [ numer, denom ]
}

var div_1 = div;

function div(a, b) {
  return rationalize_1(a[0].mul(b[1]), a[1].mul(b[0]))
}

var bigRat = makeRational;

function makeRational(numer, denom) {
  if(isRat_1(numer)) {
    if(denom) {
      return div_1(numer, makeRational(denom))
    }
    return [numer[0].clone(), numer[1].clone()]
  }
  var shift = 0;
  var a, b;
  if(isBn(numer)) {
    a = numer.clone();
  } else if(typeof numer === 'string') {
    a = strToBn(numer);
  } else if(numer === 0) {
    return [numToBn(0), numToBn(1)]
  } else if(numer === Math.floor(numer)) {
    a = numToBn(numer);
  } else {
    while(numer !== Math.floor(numer)) {
      numer = numer * Math.pow(2, 256);
      shift -= 256;
    }
    a = numToBn(numer);
  }
  if(isRat_1(denom)) {
    a.mul(denom[1]);
    b = denom[0].clone();
  } else if(isBn(denom)) {
    b = denom.clone();
  } else if(typeof denom === 'string') {
    b = strToBn(denom);
  } else if(!denom) {
    b = numToBn(1);
  } else if(denom === Math.floor(denom)) {
    b = numToBn(denom);
  } else {
    while(denom !== Math.floor(denom)) {
      denom = denom * Math.pow(2, 256);
      shift += 256;
    }
    b = numToBn(denom);
  }
  if(shift > 0) {
    a = a.ushln(shift);
  } else if(shift < 0) {
    b = b.ushln(-shift);
  }
  return rationalize_1(a, b)
}

var cmp_1 = cmp;

function cmp(a, b) {
    return a[0].mul(b[1]).cmp(b[0].mul(a[1]))
}

var bnToNum = bn2num;

//TODO: Make this better
function bn2num(b) {
  var l = b.length;
  var words = b.words;
  var out = 0;
  if (l === 1) {
    out = words[0];
  } else if (l === 2) {
    out = words[0] + (words[1] * 0x4000000);
  } else {
    for (var i = 0; i < l; i++) {
      var w = words[i];
      out += w * Math.pow(0x4000000, i);
    }
  }
  return bnSign(b) * out
}

var ctz = twiddle.countTrailingZeros;

var ctz_1 = ctzNumber;

//Counts the number of trailing zeros
function ctzNumber(x) {
  var l = ctz(double_1.lo(x));
  if(l < 32) {
    return l
  }
  var h = ctz(double_1.hi(x));
  if(h > 20) {
    return 52
  }
  return h + 32
}

var toFloat = roundRat;

// Round a rational to the closest float
function roundRat (f) {
  var a = f[0];
  var b = f[1];
  if (a.cmpn(0) === 0) {
    return 0
  }
  var h = a.abs().divmod(b.abs());
  var iv = h.div;
  var x = bnToNum(iv);
  var ir = h.mod;
  var sgn = (a.negative !== b.negative) ? -1 : 1;
  if (ir.cmpn(0) === 0) {
    return sgn * x
  }
  if (x) {
    var s = ctz_1(x) + 4;
    var y = bnToNum(ir.ushln(s).divRound(b));
    return sgn * (x + y * Math.pow(2, -s))
  } else {
    var ybits = b.bitLength() - ir.bitLength() + 53;
    var y = bnToNum(ir.ushln(ybits).divRound(b));
    if (ybits < 1023) {
      return sgn * y * Math.pow(2, -ybits)
    }
    y *= Math.pow(2, -1023);
    return sgn * y * Math.pow(2, 1023 - ybits)
  }
}

var ratVec = float2rat;



function float2rat(v) {
  var result = new Array(v.length);
  for(var i=0; i<v.length; ++i) {
    result[i] = bigRat(v[i]);
  }
  return result
}

var SMALLEST_DENORM = Math.pow(2, -1074);
var UINT_MAX = (-1)>>>0;

var nextafter_1 = nextafter;

function nextafter(x, y) {
  if(isNaN(x) || isNaN(y)) {
    return NaN
  }
  if(x === y) {
    return x
  }
  if(x === 0) {
    if(y < 0) {
      return -SMALLEST_DENORM
    } else {
      return SMALLEST_DENORM
    }
  }
  var hi = double_1.hi(x);
  var lo = double_1.lo(x);
  if((y > x) === (x > 0)) {
    if(lo === UINT_MAX) {
      hi += 1;
      lo = 0;
    } else {
      lo += 1;
    }
  } else {
    if(lo === 0) {
      lo = UINT_MAX;
      hi -= 1;
    } else {
      lo -= 1;
    }
  }
  return double_1.pack(lo, hi)
}

var mul_1 = mul;

function mul(a, b) {
  return rationalize_1(a[0].mul(b[0]), a[1].mul(b[1]))
}

var sub_1 = sub;

function sub(a, b) {
  return rationalize_1(a[0].mul(b[1]).sub(a[1].mul(b[0])), a[1].mul(b[1]))
}

var sign_1 = sign$2;

function sign$2(x) {
  return bnSign(x[0]) * bnSign(x[1])
}

var sub_1$1 = sub$1;

function sub$1(a, b) {
  var n = a.length;
  var r = new Array(n);
    for(var i=0; i<n; ++i) {
    r[i] = sub_1(a[i], b[i]);
  }
  return r
}

var add_1 = add;

function add(a, b) {
  return rationalize_1(
    a[0].mul(b[1]).add(b[0].mul(a[1])),
    a[1].mul(b[1]))
}

var add_1$1 = add$1;

function add$1 (a, b) {
  var n = a.length;
  var r = new Array(n);
  for (var i=0; i<n; ++i) {
    r[i] = add_1(a[i], b[i]);
  }
  return r
}

var muls_1 = muls;

function muls(a, x) {
  var s = bigRat(x);
  var n = a.length;
  var r = new Array(n);
  for(var i=0; i<n; ++i) {
    r[i] = mul_1(a[i], s);
  }
  return r
}

var ratSegIntersect = solveIntersection;









function ratPerp (a, b) {
  return sub_1(mul_1(a[0], b[1]), mul_1(a[1], b[0]))
}

// Solve for intersection
//  x = a + t (b-a)
//  (x - c) ^ (d-c) = 0
//  (t * (b-a) + (a-c) ) ^ (d-c) = 0
//  t * (b-a)^(d-c) = (d-c)^(a-c)
//  t = (d-c)^(a-c) / (b-a)^(d-c)

function solveIntersection (a, b, c, d) {
  var ba = sub_1$1(b, a);
  var dc = sub_1$1(d, c);

  var baXdc = ratPerp(ba, dc);

  if (sign_1(baXdc) === 0) {
    return null
  }

  var ac = sub_1$1(a, c);
  var dcXac = ratPerp(dc, ac);

  var t = div_1(dcXac, baXdc);
  var s = muls_1(ba, t);
  var r = add_1$1(a, s);

  return r
}

var cleanPslg = cleanPSLG;












// Bounds on a rational number when rounded to a float
function boundRat (r) {
  var f = toFloat(r);
  return [
    nextafter_1(f, -Infinity),
    nextafter_1(f, Infinity)
  ]
}

// Convert a list of edges in a pslg to bounding boxes
function boundEdges (points, edges) {
  var bounds = new Array(edges.length);
  for (var i = 0; i < edges.length; ++i) {
    var e = edges[i];
    var a = points[e[0]];
    var b = points[e[1]];
    bounds[i] = [
      nextafter_1(Math.min(a[0], b[0]), -Infinity),
      nextafter_1(Math.min(a[1], b[1]), -Infinity),
      nextafter_1(Math.max(a[0], b[0]), Infinity),
      nextafter_1(Math.max(a[1], b[1]), Infinity)
    ];
  }
  return bounds
}

// Convert a list of points into bounding boxes by duplicating coords
function boundPoints (points) {
  var bounds = new Array(points.length);
  for (var i = 0; i < points.length; ++i) {
    var p = points[i];
    bounds[i] = [
      nextafter_1(p[0], -Infinity),
      nextafter_1(p[1], -Infinity),
      nextafter_1(p[0], Infinity),
      nextafter_1(p[1], Infinity)
    ];
  }
  return bounds
}

// Find all pairs of crossing edges in a pslg (given edge bounds)
function getCrossings (points, edges, edgeBounds) {
  var result = [];
  boxIntersect_1(edgeBounds, function (i, j) {
    var e = edges[i];
    var f = edges[j];
    if (e[0] === f[0] || e[0] === f[1] ||
      e[1] === f[0] || e[1] === f[1]) {
      return
    }
    var a = points[e[0]];
    var b = points[e[1]];
    var c = points[f[0]];
    var d = points[f[1]];
    if (segseg(a, b, c, d)) {
      result.push([i, j]);
    }
  });
  return result
}

// Find all pairs of crossing vertices in a pslg (given edge/vert bounds)
function getTJunctions (points, edges, edgeBounds, vertBounds) {
  var result = [];
  boxIntersect_1(edgeBounds, vertBounds, function (i, v) {
    var e = edges[i];
    if (e[0] === v || e[1] === v) {
      return
    }
    var p = points[v];
    var a = points[e[0]];
    var b = points[e[1]];
    if (segseg(a, b, p, p)) {
      result.push([i, v]);
    }
  });
  return result
}

// Cut edges along crossings/tjunctions
function cutEdges (floatPoints, edges, crossings, junctions, useColor) {
  var i, e;

  // Convert crossings into tjunctions by constructing rational points
  var ratPoints = floatPoints.map(function(p) {
      return [
          bigRat(p[0]),
          bigRat(p[1])
      ]
  });
  for (i = 0; i < crossings.length; ++i) {
    var crossing = crossings[i];
    e = crossing[0];
    var f = crossing[1];
    var ee = edges[e];
    var ef = edges[f];
    var x = ratSegIntersect(
      ratVec(floatPoints[ee[0]]),
      ratVec(floatPoints[ee[1]]),
      ratVec(floatPoints[ef[0]]),
      ratVec(floatPoints[ef[1]]));
    if (!x) {
      // Segments are parallel, should already be handled by t-junctions
      continue
    }
    var idx = floatPoints.length;
    floatPoints.push([toFloat(x[0]), toFloat(x[1])]);
    ratPoints.push(x);
    junctions.push([e, idx], [f, idx]);
  }

  // Sort tjunctions
  junctions.sort(function (a, b) {
    if (a[0] !== b[0]) {
      return a[0] - b[0]
    }
    var u = ratPoints[a[1]];
    var v = ratPoints[b[1]];
    return cmp_1(u[0], v[0]) || cmp_1(u[1], v[1])
  });

  // Split edges along junctions
  for (i = junctions.length - 1; i >= 0; --i) {
    var junction = junctions[i];
    e = junction[0];

    var edge = edges[e];
    var s = edge[0];
    var t = edge[1];

    // Check if edge is not lexicographically sorted
    var a = floatPoints[s];
    var b = floatPoints[t];
    if (((a[0] - b[0]) || (a[1] - b[1])) < 0) {
      var tmp = s;
      s = t;
      t = tmp;
    }

    // Split leading edge
    edge[0] = s;
    var last = edge[1] = junction[1];

    // If we are grouping edges by color, remember to track data
    var color;
    if (useColor) {
      color = edge[2];
    }

    // Split other edges
    while (i > 0 && junctions[i - 1][0] === e) {
      var junction = junctions[--i];
      var next = junction[1];
      if (useColor) {
        edges.push([last, next, color]);
      } else {
        edges.push([last, next]);
      }
      last = next;
    }

    // Add final edge
    if (useColor) {
      edges.push([last, t, color]);
    } else {
      edges.push([last, t]);
    }
  }

  // Return constructed rational points
  return ratPoints
}

// Merge overlapping points
function dedupPoints (floatPoints, ratPoints, floatBounds) {
  var numPoints = ratPoints.length;
  var uf = new unionFind(numPoints);

  // Compute rational bounds
  var bounds = [];
  for (var i = 0; i < ratPoints.length; ++i) {
    var p = ratPoints[i];
    var xb = boundRat(p[0]);
    var yb = boundRat(p[1]);
    bounds.push([
      nextafter_1(xb[0], -Infinity),
      nextafter_1(yb[0], -Infinity),
      nextafter_1(xb[1], Infinity),
      nextafter_1(yb[1], Infinity)
    ]);
  }

  // Link all points with over lapping boxes
  boxIntersect_1(bounds, function (i, j) {
    uf.link(i, j);
  });

  // Do 1 pass over points to combine points in label sets
  var noDupes = true;
  var labels = new Array(numPoints);
  for (var i = 0; i < numPoints; ++i) {
    var j = uf.find(i);
    if (j !== i) {
      // Clear no-dupes flag, zero out label
      noDupes = false;
      // Make each point the top-left point from its cell
      floatPoints[j] = [
        Math.min(floatPoints[i][0], floatPoints[j][0]),
        Math.min(floatPoints[i][1], floatPoints[j][1])
      ];
    }
  }

  // If no duplicates, return null to signal termination
  if (noDupes) {
    return null
  }

  var ptr = 0;
  for (var i = 0; i < numPoints; ++i) {
    var j = uf.find(i);
    if (j === i) {
      labels[i] = ptr;
      floatPoints[ptr++] = floatPoints[i];
    } else {
      labels[i] = -1;
    }
  }

  floatPoints.length = ptr;

  // Do a second pass to fix up missing labels
  for (var i = 0; i < numPoints; ++i) {
    if (labels[i] < 0) {
      labels[i] = labels[uf.find(i)];
    }
  }

  // Return resulting union-find data structure
  return labels
}

function compareLex2 (a, b) { return (a[0] - b[0]) || (a[1] - b[1]) }
function compareLex3 (a, b) {
  var d = (a[0] - b[0]) || (a[1] - b[1]);
  if (d) {
    return d
  }
  if (a[2] < b[2]) {
    return -1
  } else if (a[2] > b[2]) {
    return 1
  }
  return 0
}

// Remove duplicate edge labels
function dedupEdges (edges, labels, useColor) {
  if (edges.length === 0) {
    return
  }
  if (labels) {
    for (var i = 0; i < edges.length; ++i) {
      var e = edges[i];
      var a = labels[e[0]];
      var b = labels[e[1]];
      e[0] = Math.min(a, b);
      e[1] = Math.max(a, b);
    }
  } else {
    for (var i = 0; i < edges.length; ++i) {
      var e = edges[i];
      var a = e[0];
      var b = e[1];
      e[0] = Math.min(a, b);
      e[1] = Math.max(a, b);
    }
  }
  if (useColor) {
    edges.sort(compareLex3);
  } else {
    edges.sort(compareLex2);
  }
  var ptr = 1;
  for (var i = 1; i < edges.length; ++i) {
    var prev = edges[i - 1];
    var next = edges[i];
    if (next[0] === prev[0] && next[1] === prev[1] &&
      (!useColor || next[2] === prev[2])) {
      continue
    }
    edges[ptr++] = next;
  }
  edges.length = ptr;
}

function preRound (points, edges, useColor) {
  var labels = dedupPoints(points, [], boundPoints(points));
  dedupEdges(edges, labels, useColor);
  return !!labels
}

// Repeat until convergence
function snapRound (points, edges, useColor) {
  // 1. find edge crossings
  var edgeBounds = boundEdges(points, edges);
  var crossings = getCrossings(points, edges, edgeBounds);

  // 2. find t-junctions
  var vertBounds = boundPoints(points);
  var tjunctions = getTJunctions(points, edges, edgeBounds, vertBounds);

  // 3. cut edges, construct rational points
  var ratPoints = cutEdges(points, edges, crossings, tjunctions, useColor);

  // 4. dedupe verts
  var labels = dedupPoints(points, ratPoints, vertBounds);

  // 5. dedupe edges
  dedupEdges(edges, labels, useColor);

  // 6. check termination
  if (!labels) {
    return (crossings.length > 0 || tjunctions.length > 0)
  }

  // More iterations necessary
  return true
}

// Main loop, runs PSLG clean up until completion
function cleanPSLG (points, edges, colors) {
  // If using colors, augment edges with color data
  var prevEdges;
  if (colors) {
    prevEdges = edges;
    var augEdges = new Array(edges.length);
    for (var i = 0; i < edges.length; ++i) {
      var e = edges[i];
      augEdges[i] = [e[0], e[1], colors[i]];
    }
    edges = augEdges;
  }

  // First round: remove duplicate edges and points
  var modified = preRound(points, edges, !!colors);

  // Run snap rounding until convergence
  while (snapRound(points, edges, !!colors)) {
    modified = true;
  }

  // Strip color tags
  if (!!colors && modified) {
    prevEdges.length = 0;
    colors.length = 0;
    for (var i = 0; i < edges.length; ++i) {
      var e = edges[i];
      prevEdges.push([e[0], e[1]]);
      colors.push(e[2]);
    }
  }

  return modified
}

var MAX_HOLE_LEN = 16;

const PLANE = new Plane();
const POINT = new Vector3();

// dfs search through edges by related mapped edge.prev vertices
function searchEdgeList(map, builtContour, startingEdge) {
    let edgeList = map.get(startingEdge.vertex);
    if (!edgeList) return 0;
    let len = edgeList.length;
    builtContour[0] = startingEdge;
    for (let i=0; i<len; i++) {
        let bi = searchEdge(map, builtContour, edgeList[i], startingEdge, 1);
        if (bi >= 3) return bi;
    }
    return 0;
}
function searchEdge(map, builtContour, edge, startingEdge, bi) {
    if (bi >= MAX_HOLE_LEN) return 0;
    let edgeList = map.get(edge.vertex);
    if (!edgeList) return 0;
    let i;
    let len = edgeList.length;
    builtContour[bi++] = edge;

    for (i=0; i<len; i++) {
        if (edgeList[i] === startingEdge) {
            return bi;
        }
        else {
           let result =  searchEdge(map, builtContour, edgeList[i], startingEdge, bi);
           if (result >= 3) return result;
        }
    }
    return 0;
}

var transformId = 0;

class NavMeshUtils {

    // TODO: extrude boundary edges to fill up by boundary edges
    // boundary edge: add polygon extrude..
    // todo: boundary edge: inset

    /*
    static cacheRegionIndexLookup(navMesh) {
		if (!navMesh.regionIndexMap) {
			navMesh.regionIndexMap = new Map();
			var len = navMesh.regions.length;
			for (var i=0; i<len; i++) {
				navMesh.regionIndexMap.set(navMesh.regions[i], i);
			}
			navMesh.getNodeIndex = NavMeshUtils.getCachedNodeIndexForRegionProto;
		}
	}

	static getCachedNodeIndexForRegionProto(region) {
		return this.regionIndexMap.has(region) ? this.regionIndexMap.get(region) : -1;
    }
    */

    /**
     * Sets up triangulated data for 3D rendering from  polygon references to be extruded
     * @param {*} collector An object of existing "vertices" and "indices" array to push values into
     * @param {Array} polygons Assumed all polygons in this list share a unique exclusive set of vertices for them only
     * @param {Boolean} yVal Extrude downwards by yVal of current polygon's y values, otherwise, extrude down to yBottom if yBottom is defined number, with  yVAl is treated as fixed y value to extrude from.
     * @param {Boolean} xzScale The scale for output vertices in XZ direction
     * @param {Boolean|Number} yBottom   If yBottom is set to boolean true instead, than yVal is treated as the absolute "bottom" value instead to extrude downwards towards from current polygons' y positions.
     * @param {Number} yBottomMin If yBottom isn't specified as an absolute number, this additional optional parameter limits how far down a polygon can extrude downwards by an absolute y value
     */
    static collectExtrudeGeometry(collector, polygons, yVal, xzScale=1 , yBottom, yBottomMin) {
        // yVal, yBottom, yBottomMin may be unique per polygon if polygon has it's own exclusive "yExtrudeParams" settings
        //  that overwrites existing default params
    }


     /**
     *
     * @param {HalfEdge} edge A HalfEdge to extrude from (using facing "normal", inwards for HalfEdge)
     * @param {Number} extrudeVal How much to extrude from in negative/positive direction
     * @return The sepearte newly-created polygon formed as a result of the extruded edge
     */
    static getNewExtrudeEdgePolygon( edge, extrudeVal) {

    }

    /**
     * Clones a polygon entirely with an entir enew set of HalfEdges and vertex references
     * @param {Polygon} polygon 
     */
    static clonePolygon(polygon) {
        let contours = [];
        let edge = polygon.edge;
        do {
            contours.push(edge.vertex.clone());
            edge = edge.next;
        } while (edge !== polygon.edge);

        return new Polygon().fromContour(contours);
    }


    /**
     * LInk polygons by connecting quad polygons
     * @param {HalfEdge} connector A HalfEdge of a Polygon #1 
     * @param {HalfEdge} connector2 A HalfEdge of a Polygon #2
     * @param {Polygon} connector3 This will be the connecting polygon to link the polgons if any, given 2 border edges
     * @return The resulting connecting polygons 
     */
    static linkPolygons(connector, connector2=null, connector3=null) {
        let polies = [];
        // kiv todo: connector, connector2 (without connector3) case when needed
        let edge;

        let contours = [];
        let c = 0;
        // naive connection by edge midpoint distance checks
        if (connector3 !== null) {
            let connector3Arr = [connector3];
            c = 0;
            POINT.x = (connector.prev.vertex.x + connector.vertex.x) * 0.5;
            POINT.z = (connector.prev.vertex.z + connector.vertex.z) * 0.5;
            edge = NavMeshUtils.getClosestBorderEdgeCenterToPoint(connector3Arr, POINT);
            // edge to connector
            
            contours[c++] = edge.vertex;
            contours[c++] = connector.prev.vertex;
            contours[c++] = connector.vertex;
            contours[c++] = edge.prev.vertex;

            
            let p;
            polies.push(p = new Polygon().fromContour(contours));

            p.edge.twin = connector.prev;
            connector.prev.twin = p.edge;

            if (connector2 !== null) {
                let p2;
                c =0;
                POINT.x = (connector2.prev.vertex.x + connector2.vertex.x) * 0.5;
                POINT.z = (connector2.prev.vertex.z + connector2.vertex.z) * 0.5;
                edge = NavMeshUtils.getClosestBorderEdgeCenterToPoint(connector3Arr, POINT);

                contours[c++] = edge.vertex;
                contours[c++] = connector2.prev.vertex;
                contours[c++] = connector2.vertex;
                contours[c++] = edge.prev.vertex;
                
                polies.push(p2 =  new Polygon().fromContour(contours));
                p2.edge.twin = connector2.prev;
                connector2.prev.twin = p2.edge;
            }
        }
        return polies;
    }

    static getClosestBorderEdgeCenterToPoint(polygons, pt, distLimit=0, ignoreBorder=false) {
        let len = polygons.length;
        let dist = Infinity;
        let result = null;
        if (!distLimit) distLimit = Infinity;
        else distLimit*=distLimit;

        for (let i =0;i<len; i++) {
            let r = polygons[i];
            let edge = r.edge;
            let ex;
            let ez;
            let dx;
            let dz;
            do {
                if (!edge.twin || ignoreBorder) {
                    ex = (edge.prev.vertex.x + edge.vertex.x) * 0.5;
                    ez = (edge.prev.vertex.z + edge.vertex.z) * 0.5;
                    dx = pt.x - ex;
                    dz = pt.z - ez;
                    let cDist = dx * dx + dz * dz;
                    if (cDist < dist && cDist <= distLimit) {
                        dist = cDist;
                        result = edge;
                    }
                }
                edge = edge.next;
            } while (edge !== r.edge);
        }
        return result;
    } 

    static scalePolygons(polygons, xzScale) {
        transformId++;
        let len = polygons.length;
        for (let i=0; i<len; i++) {
            let polygon = polygons[i];
            let edge = polygon.edge;
            do {
                if (edge.vertex !== transformId) {
                    edge.vertex.x *= xzScale;
                    edge.vertex.z *= xzScale;
                    edge.vertex.transformId = transformId;
                }
                edge = edge.next;
            } while (edge !== polygon.edge);
        }
    }


   /**
    * somewhat like divideEdgeByVertex...
    * kiv Later, mainly for navmesh ramp connections between AND Highways/Upper roads with Lower ward floor navmesh, and connectios
    * to remaining part of ramp building area navmesh to lower floor navmesh
    * - Highway (+Upper Ward regions) navmesh
    * - Upper ward road navmesh
    * - Ground navmesh (ground subtracted with buildings and city wall/(grounded pillar extrudes))
    *  (all linked by ramps/ramp-areas)
    *
    *  - (atm. CIty wall navmesh is completely seperate and requires special access)
    * @param {HalfEdge} subjectEdge  The HalfEdge belonging to Polygon #1 to split by connectingEdge
    * @param {HalfEdge} connectingEdge The collinear HalfEdge belonging to Polygon #2
    * @param {HalfEdge} setTwinLinks Whether to set twin links between both polygons
    * @return THe resulting connecting portal HalfEdge from subjectEdge
    */
   static addConnectingPortal(subjectEdge, connectingEdge, setTwinLinks=false) {

   }

    /**
     * Seperates out a list of polygons by bitmask.
     * Vertices belonging to those masked out polygons are made unique and no longer shared by other polygons except among those
     * that have been masked out as well.
     * It Map old vertices to newly cloned unique vertices for entire set of masked out polygons.
     *
     * For simplicity of algorithm, filtered out polygons must then be typically unlinked en-masse if needed, and re-applied into a new seperate navmesh
     * to natively re-create a completely seperate navmesh with correct list of connected edges vs bordered edges.
     *
     * @param {Array} polygons
     * @param {Number} mask Bitmask
     * @param {Boolean|Null} clonePolygons Whether to clone entirely new seperate polygons. If set to Null, will not duplciate vertices as well.
     */
    static filterOutPolygonsByMask(polygons, mask, clonePolygons=false, exactEquals=false) {
        let filteredPolygons = [];
        let len = polygons.length;
        let vertexMap = new Map();
        let contours = clonePolygons ? [] : null;
        let c = 0;
        for (let i=0; i<len; i++) {
            let polygon = polygons[i];
            if (polygon.mask === undefined || (exactEquals ? polygon.mask !== mask : !(polygon.mask & mask)) ) {
                continue;
            }
            c = 0;
            let edge = polygon.edge;
            do {
                if (vertexMap.has(edge.vertex)) {
                    edge.vertex = vertexMap.get(edge.vertex);
                } else {
                    let v = edge.vertex.clone();
                    vertexMap.set(edge.vertex, v);
                    if (clonePolygons) {
                        contours[c++] = v;
                    } else {
                        if (clonePolygons !== null) edge.vertex = v;
                    }
                }
                edge = edge.next;
            } while (edge !== polygon.edge);

            if (clonePolygons) {
                contours.length = c;
                filteredPolygons.push(new Polygon().fromContour(contours));
            } else filteredPolygons.push(polygon);
        }
        return filteredPolygons;
    }

    static adjustAltitudeOfAllPolygons(polygons) {
        transformId++;
        let len = polygons.length;
        for (let i=0; i<len; i++) {
            let polygon = polygons[i];
            let edge = polygon.edge;
            do {
                if (edge.vertex !== transformId) {
                    edge.vertex.y += altitude;
                    edge.vertex.transformId = transformId;
                }
                edge = edge.next;
            } while (edge !== polygon.edge);
        }
    }

    static setAbsAltitudeOfPolygon(polygon, altitude) {
        let edge = polygon.edge;
        do {
            edge.vertex.y = altitude;
            edge = edge.next;
        } while (edge !== polygon.edge);
    }

    static setAbsAltitudeOfAllPolygons(polygons, altitude) {
       let len = polygons.length;
       for (let i=0; i<len; i++) {
        let polygon = polygons[i];
        let edge = polygon.edge;
        do {
            edge.vertex.y = altitude;
            edge = edge.next;
        } while (edge !== polygon.edge);
       }
    }

    static checkAllValidPolygons(polygons) {
         let regions = polygons.regions || polygons;
         let len = regions.length;
        for (let i=0; i< len; i++) {
            // consider..create new one ?
           if (!regions[i].convex(true)) {
               return false;
           }
        }
        return true;
     }

    static unlinkPolygons(polygons) {
        let regions = polygons.regions || polygons;
        let len = regions.length;
        for (let i=0; i< len; i++) {
            let r = regions[i];
            let edge = r.edge;
            do {
                edge.twin = null;
                edge = edge.next;
            } while( edge !== r.edge)
        }
        return regions;
    }

    static weldVertices(navmesh) {
        let regions = navmesh.regions || navmesh;
        let len = regions.length;
        let map = new Map();
        let r;
        let edge;
        for (let i=0; i< len; i++) {
            r = regions[i];
            edge = r.edge;
            do {
                let key = edge.vertex.x + "," +edge.vertex.y + ","+edge.vertex.z;
                if (!map.has(key)) {
                    map.set(key, edge.vertex);
                } else {
                    edge.vertex = map.get(key);
                }
                edge = edge.next;
            } while (edge !== r.edge)
        }
    }

    static divideEdgeByVertex(splitVertex, edge) {
        let halfEdge = new HalfEdge(splitVertex);
        halfEdge.polygon = edge.polygon;

        halfEdge.prev = edge.prev;
        edge.prev.next = halfEdge;

        halfEdge.next = edge;
        edge.prev = halfEdge;
    }

    static adjustAltitudeOfPolygon(polygon, altitude) {
        let edge = polygon.edge;
        do {
            edge.vertex.y += altitude;
            edge = edge.next;
        } while (edge !== polygon.edge);
    }



   /**
    * Note: This function is 2D and assumed to work only on x and z coordinates of polygons
    * @param {Vertex} vertex Vertex is assumed to already lie directly on given edge split
    * @param {Vertex} fromEdge The edge containing the vertex belonging to polygon to be splitted, and whose vertex is where to split the polygon from
    * @return [Polygon] Array of 2 polygons
    */
    static dividePolygonByVertices2D(splitVertex, fromEdge, rightHanded=false) {
        let fromVertex = fromEdge.vertex;
        let dx = splitVertex.x - fromVertex.x;
        let dz = splitVertex.z - fromVertex.z;
        let handedness = rightHanded ? 1 : -1;
        let nx = -dz * handedness;
        let nz = dx * handedness;
        let offset = nx * fromVertex.x + nz * fromVertex.z;
        let polyContours = [fromVertex, splitVertex];
        let polyContours2 = [splitVertex, fromVertex];
        let edge = fromEdge.next;
        do {
            let v = edge.vertex;
            if (nx * v.x + nz * v.z >= offset) {
                polyContours.push(v);
            } else {
                polyContours2.push(v);
            }
            edge = edge.next;
        } while (edge !== fromEdge);

        if (polyContours.length < 3 || polyContours2.length < 3) {
            console.warn("dividePolygonByVertices2D ERROR:", polyContours, polyContours2);
            return null;
        }



        let result =  [new Polygon().fromContour(polyContours), new Polygon().fromContour(polyContours2)];
        console.log(result[0].convex(true), result[1].convex(true));
        return result;
    }


    static dividePolygonByVertices(splitVertex, fromEdge) {
        let fromVertex = fromEdge.vertex;
        PLANE.normal.crossVectors(fromEdge.polygon.plane.normal, new Vector3().subVectors(splitVertex, fromVertex));
        PLANE.fromNormalAndCoplanarPoint(PLANE.normal, fromVertex);

        let polyContours = [fromVertex, splitVertex];
        let polyContours2 = [splitVertex, fromVertex];
        let edge = fromVertex.next;
        do {
            let v = edge.vertex;
            if (PLANE.normal.dot(v)>=PLANE.constant) {
                polyContours.push(v);
            } else {
                polyContours2.push(v);
            }
            edge = edge.next;
        } while (edge !== fromVertex);

        if (polyContours.length < 3 || polyContours2.length < 3) {
            console.warn("dividePolygonByVertices ERROR:", polyContours, polyContours2);
            return null;
        }

        return [new Polygon().fromContour(polyContours), new Polygon().fromContour(polyContours2)];
    }


    static patchHoles(navmesh, holesAdded) {
        if (!holesAdded) holesAdded = [];

        // if full navmesh reference is passed, then will also push added holes into navmesh regions as walkable areas and update navmesh's graph accordingly
        let isUsingFullNavmesh = !!navmesh.regions;

        let regions = isUsingFullNavmesh ? navmesh.regions : navmesh;
        let len = regions.length;
        let r;
        let edge;
        let map = new Map();
        for (let i=0; i<len; i++) {
            r = regions[i];
            edge = r.edge;
            do {
                if (edge.twin === null) {
                    if (map.has(edge.prev.vertex)) {
                        map.get(edge.prev.vertex).push(edge);
                    }
                    else map.set(edge.prev.vertex, [edge]);
                }
                edge = edge.next;
            } while (edge !== r.edge)
        }

        let builtContour = [];
        let bi;
        for (let i=0; i<len; i++) {
            r = regions[i];
            edge = r.edge;
            do {
                if (edge.twin === null) {
                    bi =  searchEdgeList(map, builtContour, edge);

                    //e === edge &&
                    if ( bi>=3) {
                        builtContour.length = bi;
                        //console.log("Adding hole");
                        let p;
                        holesAdded.push( p = new Polygon().fromContour(builtContour.map((e)=>{return e.vertex})) );
                        p.holed = true;
                    }
                }

                edge = edge.next;
            } while (edge !== r.edge)
        }
        return holesAdded;
    }

}

const lineSegment$3 = new LineSegment();
const pointOnLineSegment$2 = new Vector3();

const CITADEL_WARD_INDEX = -1;
const T_EPSILON =  1e-7;

// City wall/Citadel bits
const BIT_TOWER = 1;
const BIT_ENTRANCE = 2;
const BIT_CITADEL_TOWER = 4;
const BIT_CITADEL_ENTRANCE = 8;
// const BIT_IS_AT_ENTRANCE = 16;

// Road bits
const BIT_HIGHWAY = 1;
const BIT_WARD_ROAD = 2;
const BIT_HIGHWAY_RAMP = 4;
// const BIT_INNER_ROAD = 4;


/*
For Kralchester3D

SVGCityReader identify:
- City Wall tower/entrance key polygons, tower/entrance pillar border edges (inward/outward 2e ach)
- entrance+highways, tower+roads connecting edges through above

for NavMeshUtils's: for
- linkPolygons(entrance+highways ... tower+roads)

*DONE as of above*

- getNewExtrudeEdgePolygon(tower/entrance pillar)

( // kiv later)
- addConnectingPortal(subjectEdge, connectingEdge, setTwinLinks?=false)

All Navmeshes:
UPPER WARDS* (kiv: 3D buildings on upper ward built from SVGCityReader)
CITY WALL
HIGHWAYS*
UPPER ROADS*
GROUND* (3D buildings on ground built from SVGCityReader)
RAMPS (3D built from SVGCityReader)

* Will be Linked by RAMPS to combine into 1 interconnected Navmesh

3D remaining:
- collectExtrudeGeometry(tower/entrance rooftops , extruded tower/pillar wall, HIGHWAYS (ramp down tagged), UPPER ROADS, CITY WALL(entry downs(CITY WALL tagged))  )

Base collection groups:
- Buildings (lower/upper)
- City Wall
- Highways
- Upper Roads
- Ramps
(not built/kiv, until altitude/heightmap considerations included in: Ground)
*/


function svgLineFromTo(from, to) {
	return "M"+from.x + ","+from.z + "L" + to.x + ","+to.z;
}

/**
 *
 * @param {NavMesh} navmesh
 * @param {Vector3} pt
 * @param {Number} mask
 */
function navmeshTagRegionByPt(navmesh, pt, mask, errors, lenient=false) {
	let r = navmesh.getRegionForPoint(pt);
	if (r) {
		r.mask = mask;
		pt.region = r;
	} else {
		if (lenient) {
			if (lenient !== true) {
				r = lenient(r);
			}
			else r = navmesh.getClosestRegion(pt);
			if (r) {
				r.mask = mask;
				pt.region = r;
				return r;
			}
		}
		if (!errors) errors = [];
		console.warn("navmeshTagRegionByPt couldn't find region:", pt, mask);
		errors.push(pt.clone());
		return errors;
	}
	return r;
}

/*
function getClosestBorderEdgeToPoint(polygons, pt) {

}
*/

/*
function getClosestPointToEdge(points, edge) {

}
*/

function pointInTriangle(px, py, c, b, a ) {
	return ( ( px - a[0] ) * ( b[1] - a[1] ) ) - ( ( b[0] - a[0] ) * ( py - a[1] ) ) >= 0 &&
	( ( px - b[0] ) * ( c[1] - b[1] ) ) - ( ( c[0] - b[0] ) * ( py - b[1] ) ) >= 0 &&
	( ( px - c[0] ) * ( a[1] - c[1] ) ) - ( ( a[0] - c[0] ) * ( py - c[1] ) ) >= 0;
	/*
	return ( ( p.x - a.x ) * ( b.z - a.z ) ) - ( ( b.x - a.x ) * ( p.z - a.z ) ) >= 0 &&
	( ( p.x - b.x ) * ( c.z - b.z ) ) - ( ( c.x - b.x ) * ( p.z - b.z ) ) >= 0 &&
	( ( p.x - c.x ) * ( a.z - c.z ) ) - ( ( a.x - c.x ) * ( p.z - c.z ) ) >= 0;
	*/
}

function setsIntersection(a,b) {
	return new Set(
		[...a].filter(x => b.has(x)));
}


function explode2DArray(arr) {
	let newArr = [];
	let len = arr.length;
	for (let i=0; i<len; i++) {
		let a = arr[i];
		let uLen = a.length;
		for (let u=0; u < uLen; u++) {
			newArr.push(a[u]);
		}
	}
	return newArr;
}


function get_side(a , b, c, point1, point2) {
	var s1 = a * point1.x + b * point1.z - c;
	var s1i = s1 > 0 ? 1 : s1 < 0 ? -1 : 0;

	var s2 = a * point2.x + b * point2.z - c;
	var s2i = s2 > 0 ? 1 : s2 < 0 ? -1 : 0;

	var side = s1i * s2i;
	return side < 0 ? -2 : side > 0 ? s1i : s1i == 0 ? s2i : s2i == 0 ? s1i : -2;
}

function getSegmentPointsFromSVGLinePath(pathString, filteredIndices) {
	let arr = (" " + pathString).split(" M ").slice(0).map((s)=>{
		return s.split(" L ").filter((s)=>{return true}).map((s)=>{
			// todo: critical error NaN and other related
			s = s.trim();
			s = s.split(",");
			let p = [parseFloat(s[0]), parseFloat(s[1])];
			return p;
		});
	});
	if (filteredIndices) {
		filteredIndices.refArray = arr.slice(0);
	}
	arr = arr.filter((pts, index)=>{
		if (filteredIndices && pts.length <= 1) {
			filteredIndices.push(index);
			return false;
		}
		return pts.length >= 2;
	});
	return arr;
}

function segPointEquals(a, b) {
	return a[0] === b[0] && a[1] === b[1];
}

function chamferEndsOfPointsList(pointsList, radius, wrapAround) {
	let len = pointsList.length;

	wrapAround = false; // wrapAround not working, temp disabled for now, but it seems a certain case already appears to wrap around ?

	for (let i =0;i<len; i++) {
		let newArr = [];
		let curPointsList = pointsList[i];
		let p0;
		let p;
		let p1;

		let prevI = i > 0 ? i - 1 : (wrapAround ? len - 1 : -1);
		let nextI = i < len - 1 ? i + 1 : (wrapAround ? 0 : -1);
		if (prevI >= 0) {
			p = curPointsList[0];
			p1 = curPointsList[1];
			p0 = pointsList[prevI][pointsList[prevI].length-1];
			_chamferInto(newArr, p, p0, p1, radius);
		} else {
			newArr.push(curPointsList[0]);
		}

		newArr = newArr.concat(curPointsList.slice(1, curPointsList.length - 1));



		if (nextI >= 0) {
			p = curPointsList[curPointsList.length - 1];
			p0 = curPointsList[curPointsList.length - 2];
			p1 = pointsList[nextI][0];
			_chamferInto(newArr, p, p0, p1, radius);
		} else {
			newArr.push(curPointsList[curPointsList.length - 1]);
		}

		pointsList[i] = newArr;
	}
}

function _chamferInto(newArr, p, p0, p1, radius) {
	let d;
	let dx = p[0] - p0[0];
	let dy = p[1] - p0[1];

	d = Math.sqrt(dx*dx + dy*dy);
	dx /=d;
	dy /=d;
	let ex = p1[0] - p[0];
	let ey = p1[1] - p[1];
	d = Math.sqrt(ex*ex + ey*ey);
	ex /=d;
	ey /=d;
	let x = (ex + dx) * 0.5;
	let y = (ey + dy) * 0.5;
	d = Math.sqrt(x*x + y*y);
	x /=d;
	y /=d;
	newArr.push([p[0]- x*radius, p[1] - y*radius]);
	newArr.push([p[0] + x*radius, p[1] + y*radius]);
}

function chamferCornersOfPoints(arr, radius) {
	arr = arr.slice(0);
	let len = arr.length - 1;
	let i;
	let newArr = [arr[0]];
	for (i=1; i<len; i++) {
		let p = arr[i];
		let p0 = arr[i-1];
		let p1 = arr[i+1];
		_chamferInto(newArr, p, p0, p1, radius);
	}

	newArr.push(arr[arr.length-1]);

	return newArr;
}

function setPolygonAABB(polygon) {
	let edge = polygon.edge;
	polygon.aabb = new AABB();
	do {
		polygon.aabb.expand(edge.vertex);
		edge = edge.next;
	} while(edge !== polygon.edge);
}

function getShortestSqDistanceToEdge(polygon, point, info) {
	let edge = polygon.edge;
	let shortestDistance = Infinity;
	do {
		lineSegment$3.set(edge.prev.vertex, edge.vertex);
		let t = lineSegment$3.closestPointToPointParameter( point, true);
		lineSegment$3.at( t, pointOnLineSegment$2 );
		let distance = pointOnLineSegment$2.squaredDistanceTo( point );
		if (distance < shortestDistance) {
			shortestDistance = distance;
			if (info) {
				info.edge = edge;
				info.t = t;
			}
		}
		edge = edge.next;
	} while(edge !== polygon.edge);
	return shortestDistance;
}

function polygonWithinDistanceOf(polygon, point, dist) {
	dist *= dist;
	let edge = polygon.edge;

	if (polygon.aabb && !polygon.aabb.containsPoint(point) ) {
		return false;
	}

	do {
		lineSegment$3.set(edge.prev.vertex, edge.vertex);
		let t = lineSegment$3.closestPointToPointParameter( point, true);
		lineSegment$3.at( t, pointOnLineSegment$2 );
		let distance = pointOnLineSegment$2.squaredDistanceTo( point );
		if (distance <= dist) {
			return true;
		}
		edge = edge.next;
	} while(edge !== polygon.edge);
	return false;
}

function overlapsFaces2D(myFace, face) {
	var v2 = null;
	var w2;
	var v = null;
	var w;

	var a;
	var b;
	var c;

	var lastVertex;
	var lastVertex2;

	w = myFace.edge;

	lastVertex = myFace.edge.prev.vertex;

	w = face.edge;
	lastVertex2 = face.edge.prev.vertex;

	v = lastVertex;
	w = myFace.edge;
	do {
		var v0 = v;
		v = w.vertex;
		var v1 = w.next.vertex;

		v2 = lastVertex2;
		w2 = face.edge;
		do {
			var v2_0 = v2;
			v2 = w2.vertex;
			var v2_1 =  w2.next.vertex;

			a = -(v2.z - (v.z));
			b = (v2.x - v.x);	// the other guy's one have this as negative
			c = a * v.x + b * (v.z);
			var sideA = get_side(a, b, c, v0, v1);
			if (sideA < -1) {
				w2 = w2.next;
				continue;
			}
			var sideB = get_side(a, b, c, v2_0, v2_1);
			if (sideB < -1) {

				w2 = w2.next;
				continue;
			}
			if (sideA * sideB < 0) {
				return false;
			}

			w2 = w2.next;
		} while (w2 !== face.edge)

		w = w.next;
	} while (w !== myFace.edge)

	return true;
}

function mergeCellsNewHull(cellA, cellB) {
	let del =  Delaunay.from(cellB ? cellA.concat(cellB) : cellA);
	return pointsFromDelHull(del);
}

function pointsFromDelHull(del) {
	let points = del.points;
	let hull = del.hull;
	let arr = [];
	let len = hull.length;
	for (let i=0; i<len; i++) {
		let baseI = (hull[i] << 1);
		arr.push([points[baseI],points[baseI+1]]);
	}
	return arr;
}

function isOverlappingCells(cellA, cellB) {
	return overlapsFaces2D(cellToPolygon(cellA) , cellToPolygon(cellB));
}

function polygonToCell(polygon) {
	let edge = polygon.edge;
	let arr = [];

	do {
		arr.push([edge.vertex.x, edge.vertex.z]);
		edge = edge.next;
	} while (edge !== polygon.edge);
	return arr;
}


function cellToPolygon(cell) {
	let poly = new Polygon();
	poly.fromContour(cell.map((p)=>{return new Vector3(p[0], 0, p[1])}));
	return poly;
}

function polygonSVGString(polygon) {
	let edge = polygon.edge;
	let str = "";
	str += "M"+edge.vertex.x+","+edge.vertex.z + " ";
	edge = edge.next;
	do {
		str += "L"+edge.vertex.x+","+edge.vertex.z + " ";
		edge = edge.next;
	} while (edge !== polygon.edge);
	str += "Z";

	return str;
}

function lineSegmentSVGStr(v1, v2) {
	let str = "M"+v1.x+","+v1.z + " ";
	str += "L"+v2.x+","+v2.z + " ";
	return str;
}

function edgeSVGString(edge) {
	let str = "M"+edge.prev.vertex.x+","+edge.prev.vertex.z + " ";
	str += "L"+edge.vertex.x+","+edge.vertex.z + " ";
	return str;
}

function cellSVGString(cell) {
	let len = cell.length;
	let str = "";
	let c = cell[0];

	str += "M"+c[0]+","+c[1] + " ";
	for (let i=1; i<len; i++) {
		c = cell[i];
		str += "L"+c[0]+","+c[1] + " ";
	}
	str += "Z";
	return str;
}

function svgPolyStrToPoints(str) {
	return str.split(" ").map((s) => {
		s = s.split(",");
		return [parseFloat(s[0]), parseFloat(s[1])];
	});
}


function getBBoxCenter(rect) {
	return new Vector3(rect.x + rect.width*.5, 0, rect.y + rect.height*.5);
}
function getTriPolygon(vertSoup, tri) {
	let poly = new Polygon().fromContour([
		new Vector3(vertSoup[tri[2]][0], 0, vertSoup[tri[2]][1]),
		new Vector3(vertSoup[tri[1]][0], 0, vertSoup[tri[1]][1]),
		new Vector3(vertSoup[tri[0]][0], 0, vertSoup[tri[0]][1])
	]);
	return poly;
}

function collinear(p1, p2, p3, threshold) {
	let x1 = p1[0];
	let y1 = p1[1];
	let x2 =  p2[0];
	let y2 = p2[1];
	let x3 = p3[0];
	let y3 =  p3[1];
	let collinear0 = x1 * (y2 - y3) +   x2 * (y3 - y1) +   x3 * (y1 - y2) <= threshold;
	//let collinear0 = ( x3 - x1 ) * ( y2 - y1 )  -  ( x2 - x1 ) * ( y3 - y1 ) <= threshold;
	return collinear0;
}

const samplePt = new Vector3();

/**
 * Analyses city SVG files generated from https://watabou.itch.io/medieval-fantasy-city-generator .
 * Acts as a springboard to generate street map, navigation graphs, etc. from SVG city layout, which is useful for conversion to 3D visualisations and games.
 *
 * Can do the following:
 * - Retrieves Wards: their neighborhoods, and building shapes within neighbourhoods for easy extrusion, among other things
 *  - Retrieves out shape polygon geometries of City/Citadel Wall and Bastions
 *  -Identify Wards (or any arbituary position) that are within the boundaries of City Wall
 *  - Retrieves Floor navmeshes from individual Wards, or their neighbourhoods, or of entire world for easy extrusion, or gameplay navigation, etc.
 *
 * - Retrieves Streetmap Navmesh (Or Highway-only navmesh Or Road-only Navmesh) for easy extrusion
 * - Able to divide out Streetmap Navmesh regions into seperate unique road sections

 * - Retrives highway exits points
 * - Retrieves Citadel building blocks shape
 * - Retrieves plaza region points and landmark
 * - Calculate ward-distances and centroid-to-point euclidean distances of Wards from Citadel and City Wall respectively
 *
 * - Create insetted navmesh
 *
 * Future considerations:
 * - Retrieves BSP tree from Ward of all its buildings, to allow for optimized near-hit first raycasting in-game on large maps.
 * - Adjust wards
*/
class SVGCityReader {

	constructor() {
		this.wards = [];
		this.citadel = null;

		// path
		this.selectorWards = "g[fill='#99948A'][stroke='#1A1917']";


		// Higher specificiality, will remove from this.selectorWards

		// if same, will attempt to discriminate between them with Citadel being the largest (if got citadel), or closest to center landmark guess
		this.selectorLandmark = "g[fill-rule='nonzero'][fill='#99948A'][stroke='#1A1917']";
		this.selectorCitadel = "g[fill-rule='nonzero'][fill='#99948A'][stroke='#1A1917']";

		this.selectorFarmhouses = "g[fill-rule='nonzero'][stroke='#99948A'][stroke-linecap='butt']";

		this.selectorRoads = "g[fill=none]";  // polyline



		// stroke-width="1.9"
		this.selectorCityWallPath = "g > path[fill='none'][stroke='#1A1917'][stroke-linejoin='round'][stroke-linecap='round']";
		this.findCityWallByCitadel = false;
		// ----------

		// General epsilon settings
		this.collinearThreshold = 0.001;
		this.collinearAreaThreshold = 0.01;
		this.sqWeldDistThreshold = 0.01;


		this.subSelectorEntranceLines = "g > line";

		// City wall settings
		this.cityWallPillarByAABBCenter = true;
		this.wallPillarRadius = 1.3;

		this.entranceWallPillarRadius = 0;
		this.entCitadelPillarRadiusScale = 1.4;
		this.chamferForWallPillars = true;
		this.chamferForEntranceWall = true;
		this.weldWallPathThreshold = 1;

		this.onlyElevateRoadsWithinWalls = false;

		// Road detection settings
		this.maxRoadEdgeLength = 8; //8;
		this.highwayMinWidth = 1.8;
		this.highwayMaxWidth = 6.2;
		this.optimalHighwayThickness = 2.0;
		this.streetIdPrecision = 0;

		this.detectRampConnectMaxDist = 8;
		this.detectHighwayConnectMaxDist = 5;
		this.detectRoadConnectMaxDist = 8;
		//this.optimalStreetThickness = 2.0;

		// Staircase/ramp settings
		this.rampLength = 2.4;
		this.rampLanding = 0.75;
		this.rampWidth = 0.75;
		this.rampMaxGradient = 0.83; // 40deg //0.9; // 42deg

		// Upper ward settings
		this.minPillarRadius = 1.7;
		this.maxPillarRadius = 3;
		this.pillarSpacing = 0.5;
		this.pillarStrengthRatio = 2.4;
		this.omitUpperWardsOutliers = true;
		this.maxBridgeDistance = 35;
		this.maxBridgeCheckpointRatio = 2;

		this.fullUpperWardCollideCheck = true;

		this.linkBridgesToHighways = true;

		// bridge anti-filters
		this.noBridgeAcrossCityWallRamp = true;
		this.noBridgeAcrossCityWall = true;

		this.supportPillarBlockLevel = 2;

		// Altitude settings
		this.cityWallTowerTopAltitude = 19.5;
		this.cityWallAltitude = 16;
		this.cityWallTowerBaseAltitude = 14;
		this.highwayAltitude = 12;
		this.wardRoadAltitude = 3;
		// this.innerWardRoadAltitude = 0;
		this.innerWardAltitude = 0;

		this.cityWallCeilThickness = 0.5;
		// extude thickness, if negative value, will sink into ground exclude bottom base faces
		this.cityWallEntranceExtrudeThickness = 1;
		this.highwayExtrudeThickness = 3;
		this.wardRoadExtrudeThickness = 0.7;

	}

	extrudePathOfPoints(points, radius, loop, cap, newPoints, _isLooping) {
		if (!newPoints) newPoints = [];
		if (_isLooping === true) {
			points = points.slice(0);
			points.reverse();
		}
		let len = points.length;
		let capFactor = cap ? 1 : 0;

		capFactor = 0; // tmep for now, caps dont work...unsure why

		for (let i=1; i<len; i++) {
			let p = points[i];
			let p0 = points[i-1];
			let p1 = i < len - 1 ? points[i+1] : null;
			let ex = p[0] - p0[0];
			let ey = p[1] - p0[1];
			let enx = ey;
			let eny = -ex;
			let nx;
			let ny;
			let d;
			let x = p[0];
			let y = p[1];
			if (p1 !== null) {
				let dx = p[0] - p0[0];
				let dy = p[1] - p0[1];
				d = Math.sqrt(dx*dx + dy*dy);
				dx /= d;
				dy /= d;
				let dnx = ey;
				let dny = -ex;
				d = Math.sqrt(dnx*dnx + dny*dny);
				dnx /=d;
				dny /=d;
				nx = (dnx + enx) * 0.5;
				ny = (dny + eny) * 0.5;
				d = Math.sqrt(nx*nx + ny*ny);
				nx /=d;
				ny /=d;
			} else {
				nx = enx;
				ny = eny;
				d = Math.sqrt(nx*nx + ny*ny);
				nx /= d;
				ny /= d;
				// extend end cap for p1 by radius
				d = Math.sqrt(ex*ex * ey*ey);
				ex /=d;
				ey /=d;
				x+= ex * radius * capFactor;
				y+= ey * radius * capFactor;
			}
			//console.log(d + "  vs "+Math.sqrt(nx*nx * ny*ny));
			d = Math.sqrt(enx*enx + eny*eny);
			enx /=d;
			eny /=d;

			// miter corner projection for radius outward
			let sc = enx * radius * nx + eny * radius * ny;

			if (i === 1) { // start cap for p0
				// extended start cap for p0 by radius
				d = Math.sqrt(ex*ex * ey*ey);
				ex /=d;
				ey /=d;
				ex *= capFactor;
				ey *= capFactor;
				newPoints.push([(p0[0]- ex * radius) + nx * radius, (p0[1] - ey * radius) + ny * radius]);
			}


			newPoints.push([x + nx * radius * sc, y + ny * radius * sc]);
		}

		if (loop) return this.extrudePathOfPoints(points, radius, false, cap, newPoints, true);

		return newPoints;
	}


	hitWardAtPoint3D(pt) {
		let wards = this.wards;
		for ( let i = 0, l = wards.length; i < l; i ++ ) {
			let w = wards[i];
			let aabb = w.aabb;
			if (pt.x >= aabb.min.x && pt.z >= aabb.min.z && pt.x <= aabb.max.x && pt.z <= aabb.max.z ) {
				if (w.polygon.contains(pt)) {
					return w;
				}
			}
		}
		return null;
	}

	/**
	 *
	 * @param {Textual contents of SVG} svgContents
	 * @param {HtmlElement|String} previewContainer Any DOM container or selector to display SVG
	 */
	parse(svgContents, previewContainer) {
		let svj = $(svgContents);
		let map = svj.find("#map");
		this.svgWidth = parseInt(svj.attr("width"));
		this.svgHeight = parseInt(svj.attr("height"));
		this.map = map;


		var g = $(this.makeSVG("g", {}));
		this.map.append(g, {});
		g.append(this.makeSVG("path", {stroke:"orange", "stroke-width":1, d: svgLineFromTo(new Vector3(-this.svgWidth*.5, 0, -this.svgHeight*.5), new Vector3(-this.svgWidth*.5 + this.maxBridgeDistance,0,-this.svgHeight*.5)) }));

		var tempContainer = null;
		if (previewContainer) {
			$(previewContainer).append(svj);
			window.document.body.style.zoom = "300%";
		} else {
			tempContainer = $(document.body).append($("<div></div>"));
		}



		let dummySelector = $("<g></g>");
		if (this.selectorRoads) {
			this.selectorRoads = map.children(this.selectorRoads);

		}
		if (this.selectorFarmhouses) {
			this.selectorFarmhouses = map.children(this.selectorFarmhouses);

		}
		if (this.selectorCitadel) {
			this.selectorCitadel = map.children(this.selectorCitadel);


		}
		if (this.selectorLandmark) {
			this.selectorLandmark = map.children(this.selectorLandmark);
		}

		if (this.selectorCityWallPath) {
			this.selectorCityWallPath = map.find(this.selectorCityWallPath);

			if (this.selectorCityWallPath.length > 1 ) {
				if (this.findCityWallByCitadel && this.selectorCitadel && this.selectorCitadel.length) ; else {	// differentate by size
					// or issit alwas the first one by convention?
					if (this.selectorCityWallPath.length > 2) {
						alert("TOo many matches found for selectorCityWallPath!! " + this.selectorCityWallPath.length);
					}
					let a = this.selectorCityWallPath.parent()[0].getBBox();
					let b = this.selectorCityWallPath.parent()[1].getBBox();
					let cityWallIndex = a.width* a.height >= b.width*b.height ? 0 : 1;
					let citadelWallIndex = cityWallIndex === 0 ? 1 : 0;

					this.selectorCitadelWall = $(this.selectorCityWallPath[citadelWallIndex]).parent();
					this.selectorCityWallPath = $(this.selectorCityWallPath[cityWallIndex]);
					this.selectorCityWall = this.selectorCityWallPath.parent();

				}
			} else {
				this.selectorCityWall =this.selectorCityWallPath.parent();
			}

			if (this.selectorCityWall.length) {
				this.navmeshCityWall = this.parseCityWalls(this.selectorCityWall, this.selectorCityWallPath, this.selectorCitadelWall);
			} else {
				console.warn("Could not find City/Citadel wall selector!");
			}

		}

		if (this.selectorWards) {
			this.selectorWards = map.children(this.selectorWards);
			if (this.selectorCitadel) this.selectorWards = this.selectorWards.not(this.selectorCitadel);
			if (this.selectorLandmark) this.selectorWards = this.selectorWards.not(this.selectorLandmark);
			//if (this.selectorRoads) this.selectorWards = this.selectorWards.not(this.selectorRoads);
			//if (this.selectorFarmhouses) this.selectorWards = this.selectorWards.not(this.selectorFarmhouses);

			this.parseWards(this.selectorWards);

			this.testRampedBuilding = new Set();
			this.testRampedBuilding.add(this.testSubdivideBuilding(this.wards[14].neighborhoodPts[0][0]));
		}


		/*
		if (this.selectorLandmark) {
			map.children(this.selectorLandmark);
		}

		if (this.selectorCitadel) {
			map.children(this.selectorCitadel);
		}
		*/

		if (tempContainer !== null) {
			tempContainer.remove();
		}

	}

	// Key public methods

	getNavmeshBundleGeometry() {

	}

	/**
	 *
	 * @param {Number} scaleXZ
	 * @param {Number} buildingInset
	 * @param {Boolean} renderPerWard
	 * @return {*} vertices/indices Object, or array of it with renderPerWard
	 */
	getWardBuildingsGeometry(scaleXZ = 1, buildingInset=0, renderPerWard=false) {
		// TODO: vertices and indices, for now, just get all per ward neighborhood for collision detection DBVH/BVH
		// for rendering buffer, consider renderPerWard, else render all

		// later, consider varying base heights at different wards even from outside city wall, at number 2 districts from city wall should be lower altitude
		//  depending on distance to city wall, let highways still extend outside city wall after ramp down
	}


	// -----

	testSubdivideBuilding(building) {
		let srcBuilding = building;
		building = building.slice(0).reverse(); // non-cleamature (svg outlines appears to be not clockwise for buildings?)
		let poly = cellToPolygon(building);
		let edge = poly.edge;
		let edges = [];
		do {
			edges.push(edge);
			edge = edge.next;
			// if (edgeCount === 4) g.append(this.makeSVG("circle", {r:0.5, fill:"white", cx:edge.vertex.x, cy:edge.vertex.z}));
		} while (edge !== poly.edge);

		//edges[Math.floor(Math.random() * edgeCount)


		let result = this.carveRamps(edges[2], true, 9, Infinity);
		this.buildRamps(result, this.highwayAltitude, this.innerWardRoadAltitude);

		return srcBuilding;
	}

	slopeDownRamp(geom, accumSlopeY, slopeYDist, toTailSide) {
		let ramp = geom.ramp;
		let len = ramp.length;

		// first landing from above
		let landing = toTailSide ? geom.head : geom.tail;
		NavMeshUtils.adjustAltitudeOfPolygon(landing, -accumSlopeY);
		// in-between ramp downs + landings if any
		for (let i =1; i<len; i+=2) {
			NavMeshUtils.adjustAltitudeOfPolygon(ramp[i], -slopeYDist - accumSlopeY);
			accumSlopeY += slopeYDist;
		}

		// last landing from below
		landing = toTailSide ? geom.tail : geom.head;
		NavMeshUtils.adjustAltitudeOfPolygon(landing, -slopeYDist - accumSlopeY);
		accumSlopeY += slopeYDist;
		return accumSlopeY;
	}

	buildRamps(result, altitude, groundLevel) {
		const alignTailEnd = result.alignTailEnd;
		let slopeYDist = altitude - groundLevel;
		slopeYDist /= result.totalFlights;

		let accumSlopeY = 0;

		let polySoup = [];
		let geometries = [];
		result.columns.forEach((column, index)=> {
			let geom = this.getGeometryFromColumn(column, alignTailEnd, result, 1, altitude);
			//svg.append(this.makeSVG("path", {stroke:"green", fill:"none", "stroke-width":0.1, d: polygonSVGString(geom.head)  }));
			//svg.append(this.makeSVG("path", {stroke:"blue", fill:"none", "stroke-width":0.1, d: polygonSVGString(geom.tail)  }));

			geom.ramp.forEach((r)=> {
				polySoup.push(r);
				//svg.append(this.makeSVG("path", {stroke:"red", fill:"none", "stroke-width":0.14, d: polygonSVGString(geom.ramp)  }));
			});
			geometries.push(geom);
		});


		// zig zag navmesh ramp connections
		const zigZagAlignTailEnd = (result.columns.length & 1)!==0 ? !alignTailEnd : alignTailEnd;
		geometries.forEach((geom, index, arr)=> {
			let splits = null;

			if (!!(index & 1) !== alignTailEnd) {
				console.log( " : "+index + " head");
				if ( index < arr.length - 1 && (splits=this.connectColumnsEdges(geom, arr[index+1], alignTailEnd, false, result))!==null) {

					polySoup.push(splits[0]);
					polySoup.push(splits[1]);
				} else {
					polySoup.push(geom.head);
				}
				accumSlopeY = this.slopeDownRamp(geom, accumSlopeY, slopeYDist, false);
			} else {
				polySoup.push(geom.head);
			}

			if (!!(index & 1) === alignTailEnd) {
				console.log( " : "+index + " tail");
				if ( index < arr.length - 1 && (splits=this.connectColumnsEdges(geom, arr[index+1], alignTailEnd, true, result))!==null) {

					polySoup.push(splits[0]);
					polySoup.push(splits[1]);
				} else {
					polySoup.push(geom.tail);
				}
				accumSlopeY = this.slopeDownRamp(geom, accumSlopeY, slopeYDist, true);
			} else {
				polySoup.push(geom.tail);
			}
		});


		let navmesh = new NavMesh();
		navmesh.attemptMergePolies = false;
		navmesh.attemptBuildGraph = false;
		navmesh.fromPolygons(polySoup);

		//let cdtObj = this.getCDTObjFromPointsList(polySoup.map(polygonToCell), true, {exterior:true});
		//polySoup = cdtObj.cdt.map((tri)=>{return getTriPolygon(cdtObj.vertices, tri)});

		var svg = $(this.makeSVG("g", {}));
		this.map.append(svg, {});
		svg.append(this.makeSVG("path", {stroke:"red", fill:"none", "stroke-width":0.15, d: navmesh.regions.map(polygonSVGString).join(" ") }));
		svg.append(this.makeSVG("path", {stroke:"blue", fill:"none", "stroke-width":0.15, d: navmesh._borderEdges.map(edgeSVGString).join(" ") }));

		return navmesh;
	}

	/**
	 * Carve out flights of zig-zagging ramps along a Polygon's Edge on available space provided by polygon.
	 * For simplicity, Polygon is assumed to be a flat top surface on x,z plane that defines the available floor space.
	 * @param {} edgeAlong
	 * @param {} alignTailEnd
	 * @param {*} maxFlights
	 */
	carveRamps(edgeAlong, alignTailEnd, maxFlights, maxFlightsPerColumn) {
		if (maxFlights === undefined) maxFlights = Infinity;
		if (maxFlightsPerColumn === undefined) maxFlightsPerColumn = Infinity;

		var svg = $(this.makeSVG("g", {}));
		this.map.append(svg, {});
		svg.append(this.makeSVG("path", {stroke:"yellow", fill:"none", "stroke-width":0.55, d: edgeSVGString(edgeAlong)}));
		var polygon = edgeAlong.polygon;

		const T = this.rampLanding * 2 + this.rampLength + T_EPSILON;
		const addFlightDist = this.rampLanding + this.rampLength;

		let dx = edgeAlong.vertex.x - edgeAlong.prev.vertex.x;
		let dz = edgeAlong.vertex.z - edgeAlong.prev.vertex.z;

		if (alignTailEnd) svg.append(this.makeSVG("path", {stroke:"green", fill:"none", "stroke-width":this.rampWidth, d: lineSegmentSVGStr(edgeAlong.prev.vertex,  new Vector3().copy(edgeAlong.prev.vertex).add(new Vector3().subVectors(edgeAlong.vertex, edgeAlong.prev.vertex).normalize().multiplyScalar(addFlightDist))) }));
		else svg.append(this.makeSVG("path", {stroke:"green", fill:"none", "stroke-width":this.rampWidth, d: lineSegmentSVGStr(edgeAlong.vertex,  new Vector3().copy(edgeAlong.vertex).add(new Vector3().subVectors(edgeAlong.prev.vertex, edgeAlong.vertex).normalize().multiplyScalar(addFlightDist))) }));

		let pter;
		if (alignTailEnd) svg.append(this.makeSVG("path", {stroke:"white", fill:"none", "stroke-width":this.rampWidth, d: lineSegmentSVGStr(edgeAlong.prev.vertex,  pter = new Vector3().copy(edgeAlong.prev.vertex).add(new Vector3().subVectors(edgeAlong.vertex, edgeAlong.prev.vertex).normalize().multiplyScalar(this.rampLanding))) }));
		else svg.append(this.makeSVG("path", {stroke:"white", fill:"none", "stroke-width":this.rampWidth, d: lineSegmentSVGStr(edgeAlong.vertex,  pter = new Vector3().copy(edgeAlong.vertex).add(new Vector3().subVectors(edgeAlong.prev.vertex, edgeAlong.vertex).normalize().multiplyScalar(this.rampLanding))) }));

		let dAccum = 0;
		let dStart = -1;

		let D = Math.sqrt(dx * dx + dz * dz);
		let dClearance = D;
		let nx = dz;
		let nz = -dx;
		let d = Math.sqrt(nx*nx + nz*nz);
		nx /=d;
		nz /=d;
		const NX = nx;
		const NZ = nz;

		let gradients = [];
		let orderedEdges = [];
		let edge = edgeAlong.next;
		edgeAlong.offset = edgeAlong.vertex.x * nx + edgeAlong.vertex.z * nz;
		edgeAlong.prev.offset = edgeAlong.offset;
		//edgeAlong.prev.offset = edgeAlong.prev.vertex.x * nx + edgeAlong.prev.vertex.z * nz;
		//console.log(edgeAlong.offset + " === " + edgeAlong.prev.offset + " :: "+ (edgeAlong.offset === edgeAlong.prev.offset));
		let i;
		do {
			edge.offset = edge.vertex.x * nx + edge.vertex.z * nz;
			orderedEdges.push(edge);
			edge = edge.next;
		} while(edge !== edgeAlong.prev);

		// default sort
		orderedEdges.sort((a,b)=>{return a.offset - b.offset});
		//console.log(edgeAlong.offset);
		//console.log(orderedEdges);

		// Scan across polygon to determine amount and bounds of space available to place ramps along edgeAlong direction
		let len = orderedEdges.length;
		edge = edgeAlong.next;
		let g1 = new Vector3(); // headside gradient
		let g2 = new Vector3(); // tailside gradient
		let hUnit = new Vector3().subVectors(edgeAlong.vertex, edgeAlong.prev.vertex);
		hUnit.normalize();
		let tUnit = new Vector3(-hUnit.x,  -hUnit.y,  -hUnit.z);

		let fromHeadside;
		let d1;
		let d2;
		let g;
		//g =  gradient along tailside +  gradient along headside
		//headGrad or tailGrad respectively = v.dot(headTailUnitVector) / (v.offset - prevV.offset)
		for (i=0; i<len; i++) {
			if (orderedEdges[i] !== edge) {  // orderedEdges[i] is found on tail side
				g1.subVectors(edge.vertex, edge.prev.vertex);
				d1 = edge.offset - edge.prev.offset;
				g2.subVectors(orderedEdges[i].vertex, orderedEdges[i].next.vertex);
				d2 = orderedEdges[i].offset -orderedEdges[i].next.offset;
				fromHeadside = false;
			} else { // orderedEdges[i]=== edge, ie. is found on head side
				g1.subVectors(edge.vertex, edge.prev.vertex);
				d1 = edge.offset - edge.prev.offset;
				edge = edge.next;
				// find next g2 on tail side

				for (g = i+1; g< len ; g++) {
					if (orderedEdges[g] !== edge) break;
				}
				if ( g < len) {
					// console.log(vertex on opposite tail side case)
					g2.subVectors(orderedEdges[g].prev.vertex, orderedEdges[g].vertex);
					d2 = orderedEdges[g].prev.offset -orderedEdges[g].offset;
				} else {
					// console.log("end vertex case");
					g = len - 1;
					g2.subVectors(orderedEdges[g].vertex, orderedEdges[g].next.vertex);
					d2 = orderedEdges[g].offset -orderedEdges[g].next.offset;
				}
				fromHeadside = true;
			}

			d = orderedEdges[i].offset - (i >= 1 ? orderedEdges[i-1].offset : edgeAlong.offset);
			if (d < 0) console.error("d should be positive magnitude!");
			if (d === 0) {
				gradients.push(null);
				continue; // no gradient found along zero offset distance
			}

			if (d1 < 0) console.error("d1 should be positive magnitude!");
			if (d2 < 0) console.error("d2 should be positive magnitude!");
			let g1grad = g1.dot(hUnit) / d1;
			let g2grad = g2.dot(tUnit) / d2;
			gradients.push([g1grad, g2grad, fromHeadside]);
			g = g1grad + g2grad;

			// minMaxD >= (T - D)/g
			// minima maxima d, where T is minimum required target distance for placing a single flight of ramp, g is overall gradient on both ends,
			// and D is current slice length at current i junctio point
			let mmd;
			if (T <= D) { // already met clearance
				if (dStart < 0) dStart = 0;
				if (g >= 0) {
					console.log("for maxima: gradient>=0 will always meet space requirements for entire d. Can step add full d.");
					dAccum += d;
				} else {
					console.log("for maxima: gradient < 0 may not meet space requirements for entire d, if it doesnt, can early exit out of full loop with remaining d");
					mmd = (T-D)/g;
					console.log("mmd:"+mmd + " :has More:"+(mmd>=d));
					if (mmd <= 0) {
						break;	// no more gradient
					}
					if (mmd >= d) { // there may be more
						dAccum += d;
					} else {
						dAccum += mmd; // reached end of closed gradient
						break;
					}

				}
			} else {  // have not met clearance
				if (g >= 0) {
					console.log("for minima: gradient>=0 may yet to meet space requirements for startD");
					mmd = (T-D)/g;
					console.log("mmd:"+mmd + " :MET:"+(mmd<=d));
					if (mmd <= d) {
						if (dStart < 0) dStart = mmd;
						dAccum += (d - mmd);
					}
				} else {
					console.log("for minima: gradient < 0 will never meet space requirements for remaining entire d. Can early exit out full loop!!");
					break;
				}
			}

			// update D to match new interval
			D += g * d;

			console.log(">d:"+d + ", "+fromHeadside + "," + d1 + ", " +  d2 + " :: "  +g1grad + " + " + g2grad + " = " + (g1grad+g2grad) + " D:"+D);

			//svg.append(this.makeSVG("circle", {stroke:"green", fill:"red", r:0.15, cx: orderedEdges[i].vertex.x, cy: orderedEdges[i].vertex.z}));
		}

		svg.append(this.makeSVG("path", {stroke:"pink", fill:"none", "stroke-width":0.14, d: lineSegmentSVGStr(pter = new Vector3().copy(edgeAlong.prev.vertex).add(edgeAlong.vertex).multiplyScalar(0.5).add(new Vector3(NX*dStart,0,NZ*dStart)), new Vector3(pter.x+NX*dAccum, 0, pter.z+NZ*dAccum)  ) }));


		if (dStart < 0 || dAccum < this.highwayMinWidth) return null;

		// Calculate columns+flights, and remaining clipped polygon

		// walk up along span of potential ramp columns for contour
		let walkD = 0; // distance walked so far
		let maxColumns = Math.floor(dAccum / this.rampWidth);
		let totalFlights = 0;

		let dLimit = dStart + maxColumns * this.rampWidth - this.rampWidth;
		i = 0;
		let rampLayDir = alignTailEnd ? hUnit : tUnit;

		// this.rampLength;
		// this.rampLanding;
		// this.rampWidth;
		// this.rampMaxGradient; // to consider later for custom height settings

		let columns = [];

		// onlu required for contours tracing
		let headV = new Vector3().copy(edgeAlong.vertex);
		let tailV = new Vector3().copy(edgeAlong.prev.vertex);
		let colContoursHead = [];
		let colContoursTail = [];

		const columnLayDir = new Vector3(NX, 0, NZ);
		const columnLayOffsetVec = new Vector3(NX, 0, NZ).multiplyScalar(this.rampWidth);
		const landingOffsetVec = new Vector3(rampLayDir.x, 0, rampLayDir.z).multiplyScalar(this.rampLanding);
		//const dummyVector = new Vector3();

		while (walkD < dLimit) {
			d = orderedEdges[i].offset - (i >= 1 ? orderedEdges[i-1].offset : edgeAlong.offset);
			if (orderedEdges[i].offset - edgeAlong.offset <= dStart || d === 0) {
				walkD += d;
				i++;
				headV.x += gradients[i][0] * d * hUnit.x + d * NX;
				headV.z += gradients[i][0] * d * hUnit.z + d * NZ;
				tailV.x += gradients[i][1] * d * tUnit.x + d * NX;
				tailV.z += gradients[i][1] * d * tUnit.z + d * NZ;
				dClearance += (gradients[i][0] + gradients[i][1]) * d;
				continue;
			}



			if (dStart > walkD) {
				g = dStart - walkD;
				//walkD += g;
				walkD = dStart;
				headV.x += gradients[i][0] * g * hUnit.x + g * NX;
				headV.z += gradients[i][0] * g * hUnit.z + g * NZ;
				tailV.x += gradients[i][1] * g * tUnit.x + g * NX;
				tailV.z += gradients[i][1] * g * tUnit.z + g * NZ;
				dClearance += (gradients[i][0] + gradients[i][1]) * g;
				// console.log("Jump starrting:"+dClearance);
			}


			let lenOffset = edgeAlong.offset + walkD + this.rampWidth;

			let rampDistLeft = this.rampWidth;
			let curClearance = dClearance;

			let c = 0;
			let c2 = 0;
			// start vertices for column
			colContoursHead[c++] =  headV.clone();
			colContoursTail[c2++] = tailV.clone();

			//svg.append(this.makeSVG("circle", {stroke:"green", fill:"red", r:0.15, cx: headV.x, cy: headV.z}));
			//svg.append(this.makeSVG("circle", {stroke:"green", fill:"red", r:0.15, cx: tailV.x, cy: tailV.z}));
			while(orderedEdges[i].offset < lenOffset) { // if end bound of ramp exceeds current orderedEdges points
				// pick up any inbetween contour for head/tail end respectively
				g = orderedEdges[i].offset - edgeAlong.offset - walkD;
				rampDistLeft -= g;
				walkD += g;
				headV.x += gradients[i][0] * g * hUnit.x + g * NX;
				headV.z += gradients[i][0] * g * hUnit.z + g * NZ;
				tailV.x += gradients[i][1] * g * tUnit.x + g * NX;
				tailV.z += gradients[i][1] * g * tUnit.z + g * NZ;
				dClearance += (gradients[i][0] + gradients[i][1]) * g;
				fromHeadside = gradients[i][2];
				if (fromHeadside) {
					colContoursHead[c++] = headV.clone();
					//svg.append(this.makeSVG("circle", {stroke:"green", fill:"red", r:0.15, cx: headV.x, cy: headV.z}));
				} else {
					colContoursTail[c2++] = tailV.clone();
					//svg.append(this.makeSVG("circle", {stroke:"green", fill:"red", r:0.15, cx: tailV.x, cy: tailV.z}));
				}
				i++;
				// console.log("IN BETWEEN");
			}



			walkD += rampDistLeft;
			dClearance += (gradients[i][0] + gradients[i][1]) * rampDistLeft;
			headV.x += gradients[i][0] * rampDistLeft * hUnit.x + rampDistLeft * NX;
			headV.z += gradients[i][0] * rampDistLeft * hUnit.z + rampDistLeft * NZ;
			tailV.x += gradients[i][1] * rampDistLeft * tUnit.x + rampDistLeft * NX;
			tailV.z += gradients[i][1] * rampDistLeft * tUnit.z + rampDistLeft * NZ;

			let useLatterEdge = false;
			// end intersection
			if (dClearance < curClearance) {
				curClearance = dClearance;
				useLatterEdge = true;
				//svg.append(this.makeSVG("circle", {stroke:"red", fill:"red", r:0.15, cx: (alignTailEnd ? tailV : headV).x, cy: (alignTailEnd ? tailV : headV).z}));
			}
			//else {
				//svg.append(this.makeSVG("circle", {stroke:"green", fill:"green", r:0.15, cx: (alignTailEnd ? tailV : headV).x, cy: (alignTailEnd ? tailV : headV).z}));
			// }

			// carve out polygon for slice

			//console.log(curClearance);
			let numFlightsForCol = Math.floor((curClearance - this.rampLanding)/addFlightDist);
			if (numFlightsForCol > maxFlightsPerColumn) {
				numFlightsForCol = maxFlightsPerColumn;
			}
			totalFlights += numFlightsForCol;

			colContoursHead[c++] = headV.clone();
			colContoursTail[c2++] = tailV.clone();

			colContoursHead.length = c;
			colContoursTail.length = c2;

			columns.push({flights:numFlightsForCol, useLatterEdge:useLatterEdge, colContoursHead:colContoursHead.slice(0), colContoursTail:colContoursTail.slice(0)}); // column built;

			if (totalFlights >= maxFlights) {
				break;
			}
		}

		// based on number of columsn, get remaining clip polygon from headV and tailV
		// dStart, dStart + this.rampWidth * columns.length

		/*
		For each column
		Landing polygon top
		Ramp polygon (if numOfFlights > 1, add in preceding landing before each non-first ramp,)
		Landing polygon bottom
		*/
		// each column slice definition (number of flights, starting from/to column edges position from which to start laying flights of ramps)
		// totalFlights, columns

		let result = {
			dStart: dStart,
			dAccum: dAccum,
			maxColumns: maxColumns,
			totalFlights: totalFlights,
			rampLayDir: rampLayDir,
			columnLayDir: columnLayDir,
			columns: columns,
			alignTailEnd: alignTailEnd
		};

		console.log("FINAL RESULT:"+dStart + " :: "+dAccum, result);
		return result;
	}

	getGeometryFromColumn(column, alignTailEnd, result, scale=1, altitude=0, precision) {
		const columnLayDir = result.columnLayDir;
		const rampLayDir = result.rampLayDir;
		const columnLayOffsetVec = new Vector3(columnLayDir.x, 0, columnLayDir.z).multiplyScalar(this.rampWidth);
		const landingOffsetVec = new Vector3(rampLayDir.x, 0, rampLayDir.z).multiplyScalar(this.rampLanding);
		const lengthOffsetVec = new Vector3();

		const numFlightsForCol = column.flights;
		const useLatterEdge = column.useLatterEdge;
		let colContoursHead = column.colContoursHead;
		let colContoursTail = column.colContoursTail;
		if ( scale !== 1 || altitude !== 0) {
			colContoursHead = colContoursHead.map((v)=>{
				v = v.clone();
				v.x *= scale;
				v.y = altitude;
				v.z *= scale;
				return v;
			});
			colContoursTail = colContoursTail.map((v)=>{
				v = v.clone();
				v.x *= scale;
				v.y = altitude;
				v.z *= scale;
				return v;
			});
		}

		let alphaHead = colContoursHead[0].clone();
		let alphaTail=  colContoursTail[0].clone();
		let omegaHead;
		let omegaTail;

		const addFlightDist = this.rampLanding + this.rampLength;

		if (useLatterEdge) {
			omegaHead = colContoursHead[colContoursHead.length-1].clone();
			omegaTail = colContoursTail[colContoursTail.length-1].clone();
			alphaHead.copy(omegaHead).sub(columnLayOffsetVec);
			alphaTail.copy(omegaTail).sub(columnLayOffsetVec);

		} else {
			omegaHead = alphaHead.clone().add(columnLayOffsetVec);
			omegaTail = alphaTail.clone().add(columnLayOffsetVec);
		}

		if (precision !== undefined) {  // kinda unreliable this method
			alphaHead.offsetC = alphaHead.x * columnLayDir.x + alphaHead.z * columnLayDir.z;
			alphaHead.offset = alphaHead.x * rampLayDir.x + alphaHead.z * rampLayDir.z;
			alphaTail.offsetC = alphaTail.x * columnLayDir.x + alphaTail.z * columnLayDir.z;
			alphaTail.offset = alphaTail.x * rampLayDir.x + alphaTail.z * rampLayDir.z;
			omegaHead.offsetC = omegaHead.x * columnLayDir.x + omegaHead.z * columnLayDir.z;
			omegaHead.offset = omegaHead.x * rampLayDir.x + omegaHead.z * rampLayDir.z;
			omegaTail.offsetC = omegaTail.x * columnLayDir.x + omegaTail.z * columnLayDir.z;
			omegaTail.offset = omegaTail.x * rampLayDir.x + omegaTail.z * rampLayDir.z;

			alphaHead.offset = Math.round(alphaHead.offset/precision) * precision;
			alphaTail.offset = Math.round(alphaTail.offset/precision) * precision;
			omegaHead.offset = Math.round(omegaHead.offset/precision) * precision;
			omegaTail.offset = Math.round(omegaTail.offset/precision) * precision;

			alphaHead.x = alphaHead.offset * rampLayDir.x + alphaHead.offsetC * columnLayDir.x;
			alphaHead.z = alphaHead.offset * rampLayDir.z + alphaHead.offsetC * columnLayDir.z;

			alphaTail.x = alphaTail.offset * rampLayDir.x + alphaTail.offsetC * columnLayDir.x;
			alphaTail.z = alphaTail.offset * rampLayDir.z + alphaTail.offsetC * columnLayDir.z;

			omegaHead.x = omegaHead.offset * rampLayDir.x + omegaHead.offsetC * columnLayDir.x;
			omegaHead.z = omegaHead.offset * rampLayDir.z + omegaHead.offsetC * columnLayDir.z;

			omegaTail.x = omegaTail.offset * rampLayDir.x + omegaTail.offsetC * columnLayDir.x;
			omegaTail.z = omegaTail.offset * rampLayDir.z + omegaTail.offsetC * columnLayDir.z;
		}

		lengthOffsetVec.copy(rampLayDir).multiplyScalar((addFlightDist * numFlightsForCol - this.rampLanding));

		if (alignTailEnd) {
			omegaTail.add(landingOffsetVec);
			alphaTail.add(landingOffsetVec);

			omegaHead.copy(omegaTail).add(lengthOffsetVec);
			alphaHead.copy(alphaTail).add(lengthOffsetVec);

		} else {
			omegaHead.add(landingOffsetVec);
			alphaHead.add(landingOffsetVec);

			omegaTail.copy(omegaHead).add(lengthOffsetVec);
			alphaTail.copy(alphaHead).add(lengthOffsetVec);
		}

		//var svg = $(this.makeSVG("g", {}));
		//this.map.append(svg, {});

		let rampPolygons = [];

		if (numFlightsForCol > 1) {
			lengthOffsetVec.copy(rampLayDir).multiplyScalar(this.rampLength);
			let len = numFlightsForCol - 1;
			let aEnd = alignTailEnd ? alphaTail : alphaHead;
			let bEnd = alignTailEnd ? omegaTail : omegaHead;
			for (let i=0; i< len; i++) {
				// slope
				let a = aEnd.clone().add(lengthOffsetVec);
				let b = bEnd.clone().add(lengthOffsetVec);
				rampPolygons.push(new Polygon().fromContour(alignTailEnd ? [a, b, bEnd, aEnd] : [aEnd, bEnd, b, a]));

				// landing
				bEnd=b.clone().add(landingOffsetVec);
				aEnd=a.clone().add(landingOffsetVec);
				rampPolygons.push(new Polygon().fromContour(alignTailEnd ? [aEnd, bEnd, b, a] : [a, b, bEnd, aEnd] ));
			}
			//svg.append(this.makeSVG("circle", {stroke:"red", fill:"red", r:0.15, cx: aEnd.x, cy: aEnd.z}));
			// final slope
			rampPolygons.push(new Polygon().fromContour(alignTailEnd ? [alphaHead, omegaHead, bEnd, aEnd] : [aEnd, bEnd, omegaTail, alphaTail]));
		} else {
			rampPolygons.push(new Polygon().fromContour([alphaHead, omegaHead, omegaTail, alphaTail]));
		}

		rampPolygons.forEach((p)=>{
			console.log(p.convex(true));
		});

		let test = new Polygon().fromContour(colContoursHead.concat([omegaHead, alphaHead]));
		let geomResult = {
			ramp: rampPolygons,
			head: new Polygon().fromContour(colContoursHead.concat([omegaHead, alphaHead])),
			tail: new Polygon().fromContour(colContoursTail.slice(0).reverse().concat([alphaTail, omegaTail]))
		};
		return geomResult;
	}



	// Splitting edge (without splitting polygon) is simpler, but may have issues with other algorithm that disallow collinearity of points
	connectColumnsEdges(columnGeom, columnGeom2, alignTailEnd, joinAtTailSide, result) {
		let poly = joinAtTailSide ? columnGeom.tail : columnGeom.head;
		let poly2 = joinAtTailSide ? columnGeom2.tail : columnGeom2.head;

		let layDirSwitch = alignTailEnd !== joinAtTailSide ? -1 : 1;

		const rampLayDir = result.rampLayDir;
		let offset = rampLayDir.x*layDirSwitch * poly.edge.prev.vertex.x + rampLayDir.z*layDirSwitch * poly.edge.prev.vertex.z;
		let offset2 = rampLayDir.x*layDirSwitch * poly2.edge.prev.vertex.x + rampLayDir.z *layDirSwitch* poly2.edge.prev.vertex.z;
		if (offset === offset2) {
			// todo: match vertices to have them shared
			return null;
		}

		let splitVertex;
		let fromEdge;
		if (offset >= offset2) {
			//console.log("offset higher")
			//join column into column2
			// into column's alphaVertex
			splitVertex = joinAtTailSide ? poly2.edge.prev.prev.vertex : poly2.edge.prev.vertex;
			fromEdge = joinAtTailSide ?  poly.edge : poly.edge.prev.prev;
		} else {
			//console.log("offset2 higher")
			//join column2 into column1
			// into column's omegaVertex
			splitVertex = joinAtTailSide ? poly.edge.prev.vertex : poly.edge.prev.prev.vertex;
			fromEdge = joinAtTailSide ?  poly2.edge.prev.prev : poly2.edge;
		}
		NavMeshUtils.divideEdgeByVertex(splitVertex, fromEdge);

		return null;
	}

	// THis method of splitting polygon doesn't work fully correctly atm...
	connectColumnsSplitPoly(columnGeom, columnGeom2, alignTailEnd, joinAtTailSide, result) {
		let poly = joinAtTailSide ? columnGeom.tail : columnGeom.head;
		let poly2 = joinAtTailSide ? columnGeom2.tail : columnGeom2.head;

		let layDirSwitch = alignTailEnd !== joinAtTailSide ? -1 : 1;

		const rampLayDir = result.rampLayDir;
		let offset = rampLayDir.x*layDirSwitch * poly.edge.prev.vertex.x + rampLayDir.z*layDirSwitch * poly.edge.prev.vertex.z;
		let offset2 = rampLayDir.x*layDirSwitch * poly2.edge.prev.vertex.x + rampLayDir.z *layDirSwitch* poly2.edge.prev.vertex.z;
		if (offset === offset2) {
			// todo: match vertices to have them shared
			return null;
		}

		let splitVertex;
		let fromEdge;
		if (offset >= offset2) {
			//console.log("offset higher")
			//join column into column2
			// into column's alphaVertex
			splitVertex = joinAtTailSide ? poly2.edge.prev.prev.vertex : poly2.edge.prev.vertex;
			fromEdge = joinAtTailSide ?  poly.edge.prev.prev : poly.edge.prev;
		} else {
			//console.log("offset2 higher")
			//join column2 into column1
			// into column's omegaVertex
			splitVertex = joinAtTailSide ? poly.edge.prev.vertex : poly.edge.prev.prev.vertex;
			fromEdge = joinAtTailSide ?  poly2.edge.prev : poly2.edge.prev.prev;

		}
		//var svg = $(this.makeSVG("g", {}));
		//this.map.append(svg, {});
		//svg.append(this.makeSVG("circle", {stroke:"red", "stroke-width": 1, fill:"red", r:0.05, cx:splitVertex.x , cy:splitVertex.z}));
		//svg.append(this.makeSVG("circle", {stroke:"blue", "stroke-width": 1, fill:"red", r:0.025, cx:fromEdge.vertex.x , cy:fromEdge.vertex.z}));
		// return null;
		return NavMeshUtils.dividePolygonByVertices2D(splitVertex, fromEdge);
	}


	makeSVG(tag, attrs) {
		var el= document.createElementNS('http://www.w3.org/2000/svg', tag);
		for (var k in attrs)
			el.setAttribute(k, attrs[k]);
		return el;
	}

	getCDTObjFromPointsList(pointsList, cleanup, params, processPointsMethod) {
		let vertices = params.vertices ? params.vertices.slice(0) : [];
		let edges = params.edges ? params.edges.slice(0) : [];
		pointsList.forEach((points, index)=> {
			let baseCount = vertices.length;

			if (processPointsMethod) points = processPointsMethod(points, index);
			let count = baseCount;

			points.forEach((p, index)=> {
				if (index >= 1) edges.push([count-1, count]);
				if (index === points.length - 1) edges.push([count, baseCount]);
				count++;
				vertices.push(p);
			});
		});

		if (cleanup) {
			if (this.citadelWallSegments.length > 0) ;
			cleanPslg(vertices, edges);
		}

		let cdt = cdt2d_1(vertices, edges, (params ? params : {exterior:true}));

		return {vertices:vertices, edges:edges, cdt:cdt};
	}

	parseCityWalls(jSel, jSelPath, jSelCitadelWall) {
		// assumed already arranged seperately in anticlockwise order
		let jEntrances = jSel.children("g");
		let jPillars = jSel.children("polygon");


		// previewing
		let g = $(this.makeSVG("g", {}));
		this.map.append(g);


		let pathString = jSelPath.attr("d");
		let pathRadius = jSelPath.attr("stroke-width") ? parseFloat(jSelPath.attr("stroke-width"))* 0.5 : 1;

		this.cityWallPillars = [];
		this.cityWallPillarPoints = [];

		this.cityWallEntrancePoints = [];
		let filteredAtCitadel = [];
		this.cityWallSegments = getSegmentPointsFromSVGLinePath(pathString, filteredAtCitadel, this.weldWallPathThreshold);

		// check for duplicate start/end points
		let testSegments = this.cityWallSegments[0];
		//console.log(this.cityWallSegments.length);
		//console.log(testSegments);
		//g.append($(this.makeSVG("circle", {cx:testSegments[testSegments.length-2][0], cy:testSegments[testSegments.length-2][1], r:20, fill:"black"  })));
		let testSegments2 = this.cityWallSegments[this.cityWallSegments.length-1];
		//g.append($(this.makeSVG("circle", {cx:testSegments2[testSegments2.length-1][0], cy:testSegments2[testSegments2.length-1][1], r:20, fill:"red"  })));
		if (segPointEquals(testSegments[0], testSegments2[testSegments2.length-1])) {
			testSegments2.pop();
			if (testSegments2.length === 0) {
				this.cityWallSegments.pop();
			}
			else if (testSegments2.length ===1) {
				console.warn("Exception test segments 2 reduced to length ===1");
				// todo; better handle this exception
				this.cityWallSegments.pop();
			}
		}

		if (filteredAtCitadel.length !== 0) {
			//console.log(filteredAtCitadel);
			let f1 = filteredAtCitadel[0];
			let f2 = filteredAtCitadel[1];

			//s	this.cityWallSegments = filteredAtCitadel.refArray.slice(f1+1, f2  ).concat(filteredAtCitadel.refArray.slice(f2+1));

			// not sure why need to add another +1
			// cityWallSegments

			this.cityWallSegments =filteredAtCitadel.refArray.slice(f2 + 1).concat(filteredAtCitadel.refArray.slice(f1+1, f2  ));


			// HACK JOB atm, need to fix function for svg path
			//let hackjob = filteredAtCitadel.refArray[f1+1];
			//filteredAtCitadel.refArray[f2+1].push( hackjob[hackjob.length-1]);
			//this.cityWallSegments[6].push(testSegments[testSegments.length-2]);

			//this.cityWallSegments[6].push(testSegments[testSegments.length-1]);

			//console.log(filteredAtCitadel.refArray[f1+1][]);

			//this.cityWallSegments.splice(5,0, filteredAtCitadel.refArray[f1+1]);

			//this.cityWallSegments = this.cityWallSegments.slice(f2-1).concat(this.cityWallSegments.slice(1, f2-1));
			//console.log(this.cityWallSegments.length);
		}



		if (this.chamferForWallPillars) {
			this.cityWallSegments.forEach((value, index, arr)=>{
				arr[index] = chamferCornersOfPoints(value, this.wallPillarRadius);
			});
		}

		if (this.chamferForEntranceWall) {

			chamferEndsOfPointsList(this.cityWallSegments, this.entranceWallPillarRadius ? this.entranceWallPillarRadius : this.wallPillarRadius*this.entCitadelPillarRadiusScale);
		}


		this.cityWallSegmentsUpper = [explode2DArray(this.cityWallSegments)]; // todo: break and rearrange from start/end citadel
	//	let ref = this.cityWallSegmentsUpper[0].slice(0);
	//	this.cityWallSegmentsUpper[0] = ref.slice(8).concat(ref.slice(1, 8));


		//this.cityWallSegmentsUpper[0] = this.cityWallSegmentsUpper[0].concat(ref.slice(0,8)); //.concat(ref.slice(0, 8))
		this.citadelWallSegmentsUpper = [];

		this.cityWallCDTBoundary = null;
		this.citadelWallPillars = [];
		this.citadelWallPillarPoints = [];
		this.citadelWallSegments = [];

		this.citadelWallEntrancePoint = null;
		this.citadelWallEntrancePillarPoints = [];



		jPillars.each((index, item)=>{
			let poly;
			this.cityWallPillars.push(poly=svgPolyStrToPoints($(item).attr("points")));
			let pt = this.cityWallPillarByAABBCenter ? getBBoxCenter(item.getBBox()) : poly.computeCentroid().centroid;
			this.cityWallPillarPoints.push(pt);
		});

		jEntrances.each((index, item)=>{
			let pt = getBBoxCenter($(item).children()[0].getBBox());
			this.cityWallEntrancePoints.push(pt);
		});


		//this.extrudePathOfPoints(pts, pathRadius, true, true)
		///*
		g.append(
			this.makeSVG("path", {"fill":"none", "stroke-width":0.5, "stroke":"orange",
				d: this.cityWallSegments.map((pts)=>{
					return this.extrudePathOfPoints(pts, pathRadius, true, true).map((p, index)=>{
						return (index >= 1 ? `L ${p[0]},${p[1]}` : `M ${p[0]},${p[1]}`)
					}).join("");
				}).join(" Z ") + " Z"}
		));
		//*/


		if (jSelCitadelWall) {
			//let collectedPoints = [];
			let gotCityWall = !!this.cityWallSegments.length;
			let cList = jSelCitadelWall.children("polygon");
			cList.each((index, item)=>{
				if (gotCityWall && (index === 0 || index === cList.length-1) ) {
					// omit head and tail pillars as it's hard to geometrically cleanl connect pillars at corners to city wall
					return;
				}
				let poly;
				this.citadelWallPillars.push(poly=svgPolyStrToPoints($(item).attr("points")));
				let pt = this.cityWallPillarByAABBCenter ? getBBoxCenter(item.getBBox()) : poly.computeCentroid().centroid;
				this.citadelWallPillarPoints.push(pt);
				//collectedPoints.push(pt);
			});

			this.citadelWallSegments = getSegmentPointsFromSVGLinePath(jSelCitadelWall.children("path").attr("d"));

			let citadelEntranceLines = jSelCitadelWall.find(this.subSelectorEntranceLines);
			if (citadelEntranceLines.length >=3) {
				this.citadelWallEntrancePoint = getBBoxCenter(citadelEntranceLines[0].getBBox());
				this.citadelWallEntrancePillarPoints.push(
					getBBoxCenter(citadelEntranceLines[1].getBBox()), // right first
					getBBoxCenter(citadelEntranceLines[2].getBBox())	// left
				);
			}


			if (this.chamferForWallPillars) {
				this.citadelWallSegments.forEach((value, index, arr)=>{
					arr[index] = chamferCornersOfPoints(value, this.wallPillarRadius*this.entCitadelPillarRadiusScale);
				});
			}

			if (this.chamferForEntranceWall) {
				chamferEndsOfPointsList(this.citadelWallSegments, this.entranceWallPillarRadius ? this.entranceWallPillarRadius : this.wallPillarRadius*this.entCitadelPillarRadiusScale, true);
			}



			this.citadelWallSegmentsUpper = [explode2DArray(this.citadelWallSegments)]; // todo: break and rearrange from start/end citadel

			///*
			g.append(
					this.makeSVG("path", {"fill":"none", "stroke-width":0.5, "stroke":"orange",
						d: this.citadelWallSegments.map((pts)=>{
							return this.extrudePathOfPoints(pts, pathRadius, true, true).map((p, index)=>{
								return (index >= 1 ? `L ${p[0]},${p[1]}` : `M ${p[0]},${p[1]}`)
							}).join("");
						}).join(" Z ") + " Z" }
				));
			//*/
		}

		this.cityWallPillarPoints.forEach((p)=>{g.append(this.makeSVG("circle", {r:0.5, fill:"yellow", cx:p.x, cy:p.z}));});
		this.cityWallEntrancePoints.forEach((p)=>{g.append(this.makeSVG("circle", {r:0.5, fill:"white", cx:p.x, cy:p.z}));});
		this.citadelWallPillarPoints.forEach((p)=>{g.append(this.makeSVG("circle", {r:0.5, fill:"red", cx:p.x, cy:p.z}));});
		this.citadelWallEntrancePillarPoints.forEach((p)=>{g.append(this.makeSVG("circle", {r:0.5, fill:"white", cx:p.x, cy:p.z}));});
		if (this.citadelWallEntrancePoint) g.append(this.makeSVG("circle", {r:0.5, fill:"white", cx:this.citadelWallEntrancePoint.x, cy:this.citadelWallEntrancePoint.z}));

		// Calculate boundary reference to see if within city walls
		let pathSpl = pathString.replace(/M /g, "").replace(/L /g, "").split(" ").map((s)=>{
			s = s.split(",");
			let p = new Vector3(parseFloat(s[0]), 0, parseFloat(s[1]));
			g.append(this.makeSVG("circle", {r:0.5, fill:"red", cx:p.x, cy:p.z}));
			return p;
		});

		let edgesBoundary = [];
		pathSpl.forEach((val, index)=>{
			edgesBoundary.push([index > 0 ? index - 1 : pathSpl.length - 1, index]);
		});

		let edgeVertices = pathSpl.map((v)=>{return [v.x, v.z]});
		cleanPslg(edgeVertices, edgesBoundary);

		let cdt = cdt2d_1(edgeVertices, edgesBoundary, {exterior:false});
		this.cityWallCDTBoundary = {tris:cdt, vertices:edgeVertices};
		/*
		g.append(
			this.makeSVG("path", {"fill":"rgba(155,255,122,0.3)", "stroke-width":0.1, "stroke":"red",
				d: cdt.map((tri)=>{return triSVGString(this.cityWallCDTBoundary.vertices, tri)}).join(" ")})
		);
		*/


		let wallRadius = 1;
		let verticesSoup = [];
		verticesSoup.push([-this.svgWidth*.5, -this.svgHeight*.5]);
		verticesSoup.push([this.svgWidth*.5, -this.svgHeight*.5]);
		verticesSoup.push([this.svgWidth*.5, this.svgHeight*.5]);
		verticesSoup.push([-this.svgWidth*.5, this.svgHeight*.5]);

		/* // kiv, not easily possible to identify city wall regions for citadel  unless seperate out initially
		this.citadelWallSegments.forEach((s)=>{

			s.forEach((p)=>{
				p.citadel = true;
			});

		});
		*/

		let lineSegments = this.citadelWallSegmentsUpper.concat(this.cityWallSegmentsUpper);

		//.concat(this.citadelWallPillars).concat(this.cityWallPillars);
		let cdtObj = this.getCDTObjFromPointsList(lineSegments,
			true, {exterior:false},
			(points, index)=>{
				//points = points.slice(0).reverse();
				return  index < lineSegments.length ? this.extrudePathOfPoints(points, wallRadius, true, true) : points;
			});

		cdt = cdtObj.cdt;
		//cdt = cdt.filter((tri)=>{return tri[0] >= 4 && tri[1] >=4 && tri[2] >=4});


		let navmesh = new NavMesh();
		navmesh.attemptBuildGraph = false;
		navmesh.fromPolygons(cdt.map((tri)=>{return getTriPolygon(cdtObj.vertices, tri)}));
		/*
		navmesh.regions.forEach((r)=> {
			if (!r.convex(true)) {
				console.error("not convex CCW!");
			}
		});
		*/
		NavMeshUtils.weldVertices(navmesh);
		let holesArr = NavMeshUtils.patchHoles(navmesh.regions);
		let combinedRegions = NavMeshUtils.unlinkPolygons(navmesh.regions.concat(holesArr));
		navmesh.regions = combinedRegions;

		//navmesh = new NavMesh();
		//navmesh.attemptBuildGraph = false;
		//navmesh.fromPolygons(combinedRegions);

		g.append(this.makeSVG("path", {stroke:"blue", fill:"rgba(255,255,0,0.4)", "stroke-width":0.15, d: navmesh.regions.map(polygonSVGString).join(" ") }));

		/*
		g.append(
			this.makeSVG("path", {"fill":"rgba(255,255,0,1)", "stroke-width":0.1, "stroke":"red",
				d: cdt.map((tri)=>{return triSVGString(cdtObj.vertices, tri)}).join(" ")})
		);
		*/

		let errors = [];

		// slightly problematic..need lenient for now
		this.cityWallPillarPoints.forEach((p)=>{(navmeshTagRegionByPt(navmesh,p, BIT_TOWER, errors, true)); });

		this.cityWallEntrancePoints.forEach((p)=>{
			(navmeshTagRegionByPt(navmesh,p, BIT_ENTRANCE, errors));
		});
		this.citadelWallPillarPoints.forEach((p)=>{(navmeshTagRegionByPt(navmesh,p, BIT_CITADEL_TOWER, errors));});
		this.citadelWallEntrancePillarPoints.forEach((p)=>{(navmeshTagRegionByPt(navmesh,p, BIT_CITADEL_TOWER, errors));});
		if (this.citadelWallEntrancePoint) navmeshTagRegionByPt(navmesh, this.citadelWallEntrancePoint, BIT_CITADEL_ENTRANCE, errors);
		errors.forEach((e)=>{
			g.append(this.makeSVG("circle", {r:0.5, "stroke":"red", fill:"white", cx:e.x, cy:e.z}));
		});

		NavMeshUtils.setAbsAltitudeOfAllPolygons(navmesh.regions, this.cityWallAltitude);

		return navmesh;
	}

	parseWards(jSel) {
		let hullVerticesSoup = [];
		let hullEdgesSoup = [[0,1], [1,2], [2,3], [3,0]];
		let hullEdgeCount = 4;

		hullVerticesSoup.push([-this.svgWidth*.5, -this.svgHeight*.5]);
		hullVerticesSoup.push([this.svgWidth*.5, -this.svgHeight*.5]);
		hullVerticesSoup.push([this.svgWidth*.5, this.svgHeight*.5]);
		hullVerticesSoup.push([-this.svgWidth*.5, this.svgHeight*.5]);

		jSel.each((index, item)=>{
			item = $(item);
			let wardObj = {neighborhoodPts: [], neighborhoodHulls: []};
			let wardObjVertices = [];
			item.children("path").each((i, hood)=> {
				hood = $(hood);
				var newStr = this.setupNeighborhoodFromPath(hood.attr("d"), wardObj, i, wardObjVertices);
				hood.attr("d", newStr);
			});

			let len;
			let i;

			let wardObjDelaunay =  Delaunay.from(wardObjVertices);
			let hull = wardObjDelaunay.hull;

			let x = 0;
			let y = 0;


			let hullAABB = new AABB();
			let hullPoints = [];
			let pt;
			let points = wardObjDelaunay.points;

			let cx = 0;
			let cy = 0;
			let startHullEdgeCount;

			len = hull.length;

			for (i=0; i<len; i++) {
				let baseI = (hull[i] << 1);
				x = points[baseI];
				y = points[baseI+1];
				let i1 = i >= 1 ? i - 1 : len - 1;
				let i3 = i >= len - 1 ? 0 : i + 1;
				let x1 = points[(hull[i1] << 1)];
				let y1 = points[(hull[i1] << 1)+1];
				let x3 = points[(hull[i3] << 1)];
				let y3 = points[(hull[i3] << 1)+1];
				let x2 = x;
				let y2 = y;
				//console.log(x1 * (y2 - y3) +   x2 * (y3 - y1) +   x3 * (y1 - y2) )
				let isCollinear = ( x3 - x1 ) * ( y2 - y1 )  -  ( x2 - x1 ) * ( y3 - y1 ) <= this.collinearAreaThreshold;

				/*
				if (isCollinear) {
					continue;
				}
				*/

				// console.log("ADDING");

				if (!isCollinear) {
					cx += x;
					cy += y;
					hullAABB.expand(pt =  new Vector3(x,0,y));
					hullPoints.push(pt);
				}

				/*
				if (i === 2) {
					let coloring =  isCollinear ? "red" : "green";
					item.append(this.makeSVG("circle", {r:0.5, fill:coloring, cx:x1, cy:y1}));
					item.append(this.makeSVG("circle", {r:0.5, fill:"pink", cx:x, cy:y}));
					item.append(this.makeSVG("circle", {r:0.5, fill:coloring, cx:x3, cy:y3}));
				}
				*/
				//if (!isCollinear) item.append(this.makeSVG("circle", {r:0.5, fill:"green", cx:x, cy:y}));


			}



			len = hullPoints.length;


			for (i=0; i<len; i++) {
				let hullVertex;
				hullVerticesSoup.push(hullVertex = [hullPoints[i].x, hullPoints[i].z]);
				hullVertex.id = index; // ward index
				if (i > 0) {
					if (i < len - 1) {
						hullEdgesSoup.push([hullEdgeCount, ++hullEdgeCount]);
					} else {
						hullEdgesSoup.push([hullEdgeCount++, startHullEdgeCount]);
					}
				}
				else {
					startHullEdgeCount = hullEdgeCount;
					hullEdgesSoup.push([hullEdgeCount, ++hullEdgeCount]);
				}
			}


			cx /= len;
			cy /= len;

			wardObj.aabb = hullAABB;
			wardObj.polygon = new Polygon().fromContour(hullPoints);
			wardObj.withinCityWall = this.checkWithinCityWall(cx, cy);
			wardObj.center = [cx,cy];
			//item.append(this.makeSVG("path", {fill:"gray", "stroke-width":0.5, "stroke":"none", d:wardObj.delaunay.renderHull()}));
			item.append(this.makeSVG("circle", {r:0.5, fill:(wardObj.withinCityWall ? "red" : "blue"), cx:cx, cy:cy}));


			this.wards.push(wardObj);
		});

		//console.log(hullVerticesSoup.length + " ::");
		//console.log(hullEdgesSoup);

		//let del;
		//del = Delaunay.from(hullVerticesSoup);

		this.setupWardNeighborhoodRoads();


		// Key stuffs
		//this.setupUpperWards(baseVerticesSoup);

		// test preview
		var g = $(this.makeSVG("g", {}));
		this.map.append(g, {});

		// temp misc tests

		let hullVerticesSoup3D = hullVerticesSoup.map((v)=> {
			let vertex = new Vector3(v[0], 0, v[1]);
			vertex.id = v.id;
			return vertex;
		});


		let navmesh;
		//console.log(verticesSoup.length + " : "+buildingEdges.length);
		// Ward costs/distances navmesh
		///*
		let cdt;

		// Wards sector navmesh
		///*
		cdt = cdt2d_1(hullVerticesSoup, hullEdgesSoup, {exterior:true});
		cdt = cdt.filter((tri)=>{return tri[0] >= 4 && tri[1] >=4 && tri[2] >=4});
		navmesh = new NavMesh();
		//navmesh.attemptMergePolies = false;
		navmesh.fromPolygons(cdt.map((tri)=>{ // this navmesh won';t cacurately reflect the wards though
			return new Polygon().fromContour([ hullVerticesSoup3D[tri[2]], hullVerticesSoup3D[tri[1]], hullVerticesSoup3D[tri[0]] ]);
		}));
		this.setupWardsForNavmesh(navmesh);
		this.setupWardCosts(navmesh);
		//*/

		// Streetmap navmesh
		///*
		cdt = cdt2d_1(hullVerticesSoup, hullEdgesSoup, {exterior:false});
		cdt = cdt.filter((tri)=>{return tri[0] >= 4 && tri[1] >=4 && tri[2] >=4});

		navmesh = new NavMesh();
		navmesh.attemptBuildGraph = false;

		navmesh.fromPolygons(cdt.map((tri)=>{
			return new Polygon().fromContour([ hullVerticesSoup3D[tri[2]], hullVerticesSoup3D[tri[1]], hullVerticesSoup3D[tri[0]] ]);
		}));
		this.navmeshRoad = this.setupHighwaysVsRoads(navmesh);
		//del.triangles = theTris;


	}



	setupWardNeighborhoodRoads() {
		let len = this.wards.length;
		let w;
		for (let i=0; i<len; i++) {
			w = this.wards[i];
		}
	}


	/**
	 *
	 * @param {*} navmesh
	 * @param {*} epsilon
	 */
	setupWardsForNavmesh(navmesh, epsilon) {
		//var g = $(this.makeSVG("g", {}));
		//this.map.append(g, {});

		// Register nodes with related wards
		let wards = this.wards;
		let len = wards.length;
		let pt = new Vector3();
		for (let i=0; i<len; i++) {
			let w = wards[i];
			pt.x = w.center[0];
			pt.z = w.center[1];
			//g.append(this.makeSVG("circle", {r:0.5, fill:"blue", cx:pt.x, cy:pt.z}));
			let r = navmesh.getRegionForPoint(pt, epsilon);
			if (!r) {
				console.error("setupWardsForNavmeshes :: Failed to find region for pinpoint");
				continue;
			}
			r.wardIndex = i;
		}

		// bypass non-ward nodes
		let regions = navmesh.regions;
		let graph = navmesh.graph;
		let edges = graph._edges;
		let nodes = graph._nodes;

		let explodeMap = new Map();
		len = regions.length;
		for (let i=0; i<len; i++) {
			let r = regions[i];
			if (r.wardIndex === undefined) {
				// r.withinCityWall = this.checkWithinCityWall(r.centroid.x, r.centroid.y); // no longer needed with explodeMap
				let listOfEdges = edges.get(i);
				explodeMap.set(i, listOfEdges.filter((e)=>{return regions[e.to].wardIndex !== undefined}).map((e)=>{return e.to}) );
			}
		}

		edges.forEach((value, key) => {
			let r = regions[key];
			if (r.wardIndex !== undefined) {
				let listOfEdges = edges.get(key);
				let newEdges = [];
				listOfEdges.forEach((value, index)=> {
					if (explodeMap.has(value.to)) {
						explodeMap.get(value.to).filter((v)=> {
							return v !== key && listOfEdges.indexOf(v) < 0
						}).forEach((v)=> {
							newEdges.push(new NavEdge(key, v, 1));
						});
					}
				});
				listOfEdges = listOfEdges.filter((value)=> {
					return !explodeMap.has(value.to);
				}).concat(newEdges);
				edges.set(key, listOfEdges);
			} else {
				edges.set(key, []);
			}
		});

	}

	getWardIndex(polygon) {
		if (polygon.wardIndex !== undefined) return polygon.wardIndex;  // a saved cached reference is found

		// identify by vertex id (doesnt work if mesh was decimated/altered from original ward hulls)
		let edge = polygon.edge;
		let lastId;
		// all vertices of polygon must have the same vertex id that links to the correct ward
		do {
			if (edge.vertex.id === undefined || (lastId !== undefined ? edge.vertex.id !== lastId : false) ) {
				return -1; // non-found values are not cached!
			}
			lastId = edge.vertex.id;
			edge = edge.next;
		} while (edge !== polygon.edge);

		return (polygon.wardIndex = edge.vertex.id); // cached found
	}

	adjustCostGraphByWards(navmesh, withinCityFree=false) {
		let graph = navmesh.graph;
		let regions = navmesh.regions;
		graph._edges.forEach((edges, nodeIndex) => {
			let len = edges.length;

			for (let i=0; i<len; i++) {
				let e = edges[i];
				let indexTo = this.getWardIndex(regions[e.to]);
				let indexFrom = this.getWardIndex(regions[e.from]);

				//if (indexTo >= 0) console.log(this.wards[indexTo].withinCityWall);
				if (indexTo >= 0 && indexFrom >=0 ) {  // same ward index always free  (dead space)
					if (indexTo === indexFrom) {
						//console.log("Smae ward free");
						e.cost = 0;
					} else if (withinCityFree && this.wards[indexFrom].withinCityWall && this.wards[indexTo].withinCityWall) {
						//console.log("Within city free");
						e.cost = 0;
					} else {
						e.cost = 1;
					//	console.log("A");
					}
				} else {
					console.error("should not happen!!:"+indexTo + " :<"+indexFrom);
				}


			}
		});
	}

	setupWardCosts(navmesh) {
		var g = $(this.makeSVG("g", {}));
		this.map.append(g, {});


		let regions = navmesh.regions;
		let len = regions.length;
		let r;
		let index;

		let dijk = new Dijkstra(navmesh.graph, -1, -1);

		this.adjustCostGraphByWards(navmesh, true);

		for (let i=0; i<len; i++) {
			r = regions[i];
			index = this.getWardIndex(r);
			if (index >=0) {
				let w = this.wards[index];
				if (w.withinCityWall) { // get costs leading up to this ward outside
					dijk.clear();
					dijk.source = i;
					/*
					let gt;
					g.append(gt = this.makeSVG("text", { style:"text-align:left; font-size:2px", x:w.center[0], y:w.center[1] }));
						$(gt).text('here');
					*/
					dijk.search();

					dijk._cost.forEach((value, key)=> {
						r = regions[key];
						index = this.getWardIndex(r);
						if (index >= 0) {
							let w  = this.wards[index];

							w.distanceOutsideToWalls = value;

							///*
							let gt;
							g.append(gt = this.makeSVG("text", { style:"text-align:left; font-size:2px", x:w.center[0], y:w.center[1] }));
							$(gt).text(value);
							//*/
						}
					});
					break;
				}
			}
		}


		/* // todo: identify citadel ward by selector center position with navmesh, useful for heights and other info
		*/
		this.adjustCostGraphByWards(navmesh, false);
		for (let i=0; i<len; i++) {
			r = regions[i];
			index = r.wardIndex;
			if (index === CITADEL_WARD_INDEX) {
				dijk.clear();
				dijk.source = i;
				///*
				let gt;
				g.append(gt = this.makeSVG("text", { style:"text-align:left; font-size:2px", x:w.center[0], y:w.center[1] }));
				$(gt).text('here');
				//*/

				dijk.search();

				dijk._cost.forEach((value, key)=> {
					r = regions[key];
					index = this.getWardIndex(r);
					if (index >= 0) {
						let w  = this.wards[index];
						w.distanceToCitadel = value;
						///*
						let gt;
						g.append(gt = this.makeSVG("text", { style:"text-align:left; font-size:2px", x:w.center[0], y:w.center[1] }));
						$(gt).text(value);
						//*/
					}
				});
				break;
			}
		}


	}

	setupHighwaysVsRoads(navmesh) {
		var g = $(this.makeSVG("g", {}));
		this.map.append(g, {});

		let regions = navmesh.regions;
		let len = regions.length;
		let r;
		let edge;



		let highwayMaxWidthSq = this.highwayMaxWidth * this.highwayMaxWidth;
		let highwayMinWidthSq = this.highwayMinWidth * this.highwayMinWidth;
		let maxRoadEdgeLengthSq =  this.maxRoadEdgeLength* this.maxRoadEdgeLength;


		const rampDowns = [];
		const rampDownLevel = this.onlyElevateRoadsWithinWalls ? this.innerWardAltitude : this.wardRoadAltitude;
		const highways = [];
		const roadsInner = [];
		const roadsOuter = [];
		const potentialHighwayRoadCrossroads = [];

		for (let i=0; i<len; i++) {
			r = regions[i];
			edge = r.edge;

			let numOfLongEdges = 0;
			let numOfShortEdges = 0;
			let numOfEdgesWithinCityWalls = 0;
			let numOfEdgesJustOutsideCityWalls = 0;

			let streetwards = new Set();

			do {
				if (edge.twin !== null &&
					edge.prev.vertex.id >= 0 && edge.vertex.id >= 0 &&
					edge.vertex.id !== edge.prev.vertex.id
				) {
					//streetnames.add(edge.vertex.id < edge.prev.vertex.id ? edge.vertex.id + "_" + edge.prev.vertex.id : edge.prev.vertex.id + "_" + edge.vertex.id);

					streetwards.add(edge.vertex.id);
					streetwards.add(edge.prev.vertex.id);

					let oppEdge = edge.next;
					while (oppEdge.vertex !== edge.prev.vertex) {
						oppEdge = oppEdge.next;
					}

					//let distance = edge.prev.vertex.squaredDistanceTo(edge.vertex);
					// the above metric isnt reliable if long road sections are telsellated across full diagnal for long thin triangles


					lineSegment$3.set(oppEdge.prev.vertex, oppEdge.vertex);
					let t = lineSegment$3.closestPointToPointParameter(edge.vertex, false);
					lineSegment$3.at( t, pointOnLineSegment$2 );

					//g.append(this.makeSVG("line", {stroke:"rgb(255,255,255)", "stroke-width":0.25, x1:lineSegment.from.x, y1:lineSegment.from.z, x2:lineSegment.to.x, y2:lineSegment.to.z}));

					numOfEdgesWithinCityWalls += this.wards[edge.prev.vertex.id].withinCityWall && this.wards[edge.vertex.id].withinCityWall ? 1 : 0;

					numOfEdgesJustOutsideCityWalls += this.wards[edge.prev.vertex.id].distanceOutsideToWalls===1 && this.wards[edge.vertex.id].distanceOutsideToWalls === 1 ? 1 : 0;

					let dist =  pointOnLineSegment$2.squaredDistanceTo( edge.vertex );

					if (dist <= highwayMaxWidthSq) {
						if (dist < highwayMinWidthSq ) { // normal street
							//g.append(this.makeSVG("line", {stroke:"rgb(255,255,255)", "stroke-width":0.25, x1:lineSegment.from.x, y1:lineSegment.from.z, x2:lineSegment.to.x, y2:lineSegment.to.z}));
							g.append(this.makeSVG("line", {stroke:"rgb(0,122,110)", "stroke-width":0.25, x1:edge.prev.vertex.x, y1: edge.prev.vertex.z, x2:edge.vertex.x, y2:edge.vertex.z}));
							numOfShortEdges++;
							edge.short = true;
						} else { // highway
							//g.append(this.makeSVG("line", {stroke:"rgb(255,255,255)", "stroke-width":0.5, x1:lineSegment.from.x, y1:lineSegment.from.z, x2:lineSegment.to.x, y2:lineSegment.to.z}));
							g.append(this.makeSVG("line", {stroke:"rgb(255,0,0)", "stroke-width":0.25, x1:edge.prev.vertex.x, y1: edge.prev.vertex.z, x2:edge.vertex.x, y2:edge.vertex.z}));
							numOfLongEdges++;
						}
					}
				}
				edge = edge.next;
			} while(edge !== r.edge);


			// various conditions for specific highlights
			let totalEdges = numOfShortEdges + numOfLongEdges;

			// street id naming
			r.streetId = Array.from(streetwards).sort();
			if (this.streetIdPrecision > 0) {
				r.streetId.slice(0, this.streetIdPrecision + 1);
			}
			r.streetId = r.streetId.join("_");
			//console.log(r.streetId);


			// or numOfEdgesWithinCityWalls >=2
			// && numOfEdgesWithinCityWalls === totalEdges && extremeLongPerpCount ===0
			if (totalEdges >= 2 ) {
				// || !this.checkWithinCityWall(r.centroid.x, r.centroid.z , true)
				if ( numOfLongEdges !== 0) {
					if ( (numOfEdgesWithinCityWalls >=2 || numOfEdgesJustOutsideCityWalls >= 2)) {
						let isRampDown = numOfEdgesWithinCityWalls < 2;
						r.mask = isRampDown ? BIT_HIGHWAY_RAMP : BIT_HIGHWAY;
						if (isRampDown) {
							r.yExtrudeParams = {yVal:this.highwayExtrudeThickness, yBottom:false, yBottomMin:this.innerWardAltitude };
							rampDowns.push(r);
						} else {
							highways.push(r);
						}
						g.append(this.makeSVG("path", {stroke:"blue", fill:(isRampDown ? "rgba(255,40,100,0.5)" : "rgba(255,0,0,0.5)"), "stroke-width":0.015, d: polygonSVGString(r) }));
						if (numOfShortEdges >=1) {
							//g.append(this.makeSVG("path", {stroke:"blue", fill:"rgba(1,0,255,0.5)", "stroke-width":0.015, d: polygonSVGString(r) }));
							if (numOfShortEdges >=2) {
								potentialHighwayRoadCrossroads.push(r);
								//g.append(this.makeSVG("path", {stroke:"blue", fill:"rgba(1,0,255,0.5)", "stroke-width":0.015, d: polygonSVGString(r) }));
							}

						}

					} else {
						if (!this.onlyElevateRoadsWithinWalls || numOfEdgesWithinCityWalls>=2) {
							r.mask = BIT_WARD_ROAD; // could be thick also
							roadsInner.push(r);
							g.append(this.makeSVG("path", {stroke:"blue", fill:"rgba(44,0,44,0.5)", "stroke-width":0.015, d: polygonSVGString(r) }));
						}
					}
				}
				else {
					if (!this.onlyElevateRoadsWithinWalls || (numOfEdgesWithinCityWalls >= 2)) {
						r.mask = BIT_WARD_ROAD; // always thin
						roadsOuter.push(r);
						g.append(this.makeSVG("path", {stroke:"blue", fill:"rgba(255,0,255,0.5)", "stroke-width":0.015, d: polygonSVGString(r) }));
					}
				}
			}
		}

		potentialHighwayRoadCrossroads.forEach((r)=> {
			if (this.validateShortRoadEdges(2, r)) {
				r.mask |= BIT_WARD_ROAD;
				roadsInner.push(r);
				g.append(this.makeSVG("path", {stroke:"blue", fill:"none", "stroke-width":0.1, d: polygonSVGString(r) }));
			}
		});

		// kiv todo: Citadel wall region identify and filter out in order to further extrude down to ward road level,
		// kiv todo: Plaza region identify and filter out, extrude down to ward Road level, extrude down to ground level as additional layer or other methods
		// kiv above: maybe have some custom mound terrain below those regions to support highway platform, or mounted terrrain with elevated wards near citadel

		// fow now, citadel wall exttudes down to rampDown level, until ground portio polygons below ctiy wall can be easily isolated


		NavMeshUtils.setAbsAltitudeOfAllPolygons(highways, this.highwayAltitude);
		NavMeshUtils.setAbsAltitudeOfAllPolygons(roadsInner, this.wardRoadAltitude);
		NavMeshUtils.setAbsAltitudeOfAllPolygons(roadsOuter, this.wardRoadAltitude);

		NavMeshUtils.setAbsAltitudeOfAllPolygons(rampDowns, rampDownLevel);

		// Connect highways to ramp-downs at city wall entrances
		this.cityWallEntrancePoints.forEach((p)=>{
			if (!p.region) return;
			let e = NavMeshUtils.getClosestBorderEdgeCenterToPoint(highways, p, this.detectHighwayConnectMaxDist, true);
			let e2 = NavMeshUtils.getClosestBorderEdgeCenterToPoint(rampDowns, p, this.detectRampConnectMaxDist, true);

			if (e) {
				//console.log("HIT!");
				e.twin = null;
				e.prev.vertex = e.prev.vertex.clone();
				e.vertex = e.vertex.clone();

				let entryWay = NavMeshUtils.clonePolygon(p.region);
				NavMeshUtils.setAbsAltitudeOfPolygon(entryWay, this.highwayAltitude);

				g.append(this.makeSVG("path", {stroke:"blue", fill:("rgba(255,0,0,0.5)"), "stroke-width":0.015, d: polygonSVGString(entryWay) }));
				g.append(this.makeSVG("path", {stroke:"white", fill:"none", "stroke-width":1, d: edgeSVGString(e) }));

				if (e2) {
					console.log("detected rampdown...");
					e2.twin = null;
					e2.prev.vertex = e2.prev.vertex.clone();
					e2.vertex = e2.vertex.clone();
					g.append(this.makeSVG("path", {stroke:"white", fill:"none", "stroke-width":1, d: edgeSVGString(e2) }));
				} else {
					console.log("detected no rampdn at entrance..");
				}

				let polies  = NavMeshUtils.linkPolygons(e, e2, entryWay);
				polies.forEach((r, index)=> {
					r.connectRamp = true;
					g.append(this.makeSVG("path", {stroke:"blue", fill:("rgba(255,0,0,0.5)"), "stroke-width":0.4, d: polygonSVGString(r) }));
					navmesh.regions.push(r);
				});
			} else {
				console.warn("Missed Entrance connect highway entirely!");
			}
		});
		rampDowns.forEach((r)=>{
			let edge = r.edge;
			do {
				if (edge.twin && edge.twin.polygon.connectRamp) {
					console.log("detected rampdown edge");
					edge.prev.vertex.y = this.highwayAltitude;
					edge.vertex.y = this.highwayAltitude;
				}
				edge = edge.next;
			} while(edge !== r.edge)
		});

		// kiv todo: connect ward roads at tower connections and mark as secondary-entrance for tower

		//  ( kiv, could be lower altitude in the future for roadsOuter)

		return navmesh;
	}

	validateShortRoadEdges(amount, region) {
		let edge = region.edge;
		let count = 0;
		do {
			if (edge.short && edge.twin && edge.twin.polygon.mask && !!(edge.twin.polygon.mask & BIT_WARD_ROAD) ) {
				count++;
				if (count >= amount) return true;
			}
			edge = edge.next;
		} while (edge !== region.edge);

		return false;
	}


	checkWithinCityWall(x, y, defaultVal=false) {
		if (!this.cityWallCDTBoundary) return defaultVal;
		let tris = this.cityWallCDTBoundary.tris;
		let vertices = this.cityWallCDTBoundary.vertices;
		let len = tris.length;
		for (let i=0; i<len; i++) {
			let tri = tris[i];
			if (pointInTriangle(x, y, vertices[tri[0]], vertices[tri[1]], vertices[tri[2]])) {
				return true;
			}
		}
		return false;
	}


	setupUpperWards(baseVerticesSoup) {
		let wards = this.wards;
		baseVerticesSoup = [baseVerticesSoup];
		let len = wards.length;
		let g;
		let sites = [];
		const maxBridgeSqDist = this.maxBridgeDistance*this.maxBridgeDistance;
		const maxBridgeSqDist2 = (this.maxBridgeDistance*this.maxBridgeCheckpointRatio)*(this.maxBridgeDistance*this.maxBridgeCheckpointRatio);



		for (let i=0; i< len; i++) {

			let cdtObj = this.getCDTObjFromPointsList(baseVerticesSoup.concat(explode2DArray(wards[i].neighborhoodPts)), true, {exterior:false});
			let cdt = cdtObj.cdt;
			cdt = cdt.filter((tri)=>{return tri[0] >= 4 && tri[1] >=4 && tri[2] >=4});
			let navmesh = new NavMesh();
			navmesh.attemptBuildGraph = false;
			navmesh.fromPolygons(cdt.map((tri)=>{return getTriPolygon(cdtObj.vertices, tri)}));

			/*
			let g = $(this.makeSVG("g", {}));
			this.map.append(g, {});
			g.append(this.makeSVG("path", {stroke:"blue", fill:"rgba(255,255,0,0.5)", "stroke-width":0.015, d: navmesh.regions.map(polygonSVGString).join(" ") }));
			*/

			/*
			var g = $(this.makeSVG("g", {}));
			this.map.append(g, {});
			g.append(this.makeSVG("circle", {r:0.5, fill:"blue", cx:cx, cy:cy}));
			*/

			let spots = SVGCityReader.getEmptyRegionsFromNavmesh(navmesh, this.minPillarRadius+this.pillarSpacing, this.maxPillarRadius+this.pillarSpacing);
			spots.forEach((beyondMaxRad, region, map) => {

				sites.push({region:region, ward:this.wards[i], beyondMaxRad:beyondMaxRad});
			});
		}

		let del = Delaunay.from(sites.map((s)=>{return [s.region.centroid.x, s.region.centroid.z]}));
		let vor = del.voronoi([-this.svgWidth*.5, -this.svgHeight*.5, this.svgWidth*.5, this.svgHeight*.5]);

		//1.5
		//g = $(this.makeSVG("g", {}));
		//this.map.append(g, {});
		//g.append(this.makeSVG("path", {stroke:"blue", "stroke-width":0.25, d: vor.render()}));

		/*
		g = $(this.makeSVG("g", {}));
		this.map.append(g, {});
		g.append(this.makeSVG("circle", {r:(beyondMaxRad ? this.maxPillarRadius : this.minPillarRadius), fill:(beyondMaxRad ? "red" : "red"), cx:region.centroid.x, cy:region.centroid.z}));
		*/

		let cells = vor.cellPolygons();

		let wBound = this.svgWidth*.5;
		let hBound = this.svgHeight*.5;
		let count = 0;
		let navmeshPolygons = [];
		for (let c of cells) {
			let s = sites[count];
			g = $(this.makeSVG("g", {}));
			this.map.append(g, {});


			let beyondMaxRad = s.beyondMaxRad;
			let atEdge = false;

			if (this.omitUpperWardsOutliers) {
				for (let i in c) {
					let p = c[i];
					if ( p[0] <= -wBound || p[1] >= wBound || p[1] <= -hBound || p[1]>=hBound ) {
						atEdge = true;
						break;
					}
				}
			}

			if (!atEdge) {
				let navmeshPoly = cellToPolygon(c);
				navmeshPoly.s = s;
				navmeshPolygons.push(navmeshPoly);
				g.append(this.makeSVG("circle", {r:(beyondMaxRad ? this.maxPillarRadius : this.minPillarRadius), fill:(beyondMaxRad ? "red" : "red"), cx:s.region.centroid.x, cy:s.region.centroid.z}));
				if (beyondMaxRad) {
					let upperWardCell = SVGCityReader.resizeHullPoints(s.region.centroid.x, s.region.centroid.z, polygonToCell(s.ward.polygon), this.pillarStrengthRatio * this.maxPillarRadius * 2, this.maxPillarRadius+this.pillarSpacing);
					s.upperWardCell = upperWardCell;
					g.append(this.makeSVG("path", {fill:"rgba(0,0,255,0.5)", "stroke-width":0.5, d: cellSVGString(upperWardCell)}));

				}
			}
			/*
			for (let p in c) {
				g.append(this.makeSVG("circle", {r:0.5, fill:"orange", cx:c[p][0], cy:c[p][1]}));
			}
			*/
			count++;
		}

		// create navmesh from cell polygons to easily track neighbors
		let navmesh = new NavMesh();
		navmesh.attemptBuildGraph = false;
		navmesh.attemptMergePolies = false;

		navmesh.fromPolygons(navmeshPolygons);
		//g.append(this.makeSVG("path", {stroke:"blue", fill:"rgba(255,255,0,0.1)", "stroke-width":0.15, d: navmesh.regions.map(polygonSVGString).join(" ") }));

		// connect 'em!
		len = navmesh.regions.length;

		// Merge/cleanup upper wards cells pass
		for (let i=0; i<len; i++) {
			let region = navmesh.regions[i];
			let edge = region.edge;
			let upperWardCell = region.s.upperWardCell;

			do {
				if (edge.done || !edge.twin || edge.twin.polygon === (edge.prev.twin ? edge.prev.twin.polygon : null) ) {
					edge = edge.next;
					continue;
				}

				let region2 = edge.twin.polygon;
				let upperWardCell2 = region2.s.upperWardCell;

				if (upperWardCell && upperWardCell2 ) {
					if (region2.upperChecked) {
						edge = edge.next;
						continue;
					}
					region.upperChecked = true;
					region2.upperChecked = true;

					if (isOverlappingCells(upperWardCell, upperWardCell2)) {
						let mergedCell = mergeCellsNewHull(upperWardCell, upperWardCell2);
						region.s.upperWardCell = mergedCell;
						region2.s.upperWardCell = mergedCell;
						g.append(this.makeSVG("path", {fill:"rgba(0,0,255,0.5)", "stroke-width":0.5, d: cellSVGString(mergedCell)}));
						edge.twin.done = true;
						edge.done = true;
					}
					// upperCellsSet.set(mergedCell, [region,region2]);
				}
				edge = edge.next;
			} while( edge !== region.edge)

			if (upperWardCell && !region.upperChecked) ;

		}

		if (this.fullUpperWardCollideCheck) {
			for (let i=0; i<len; i++) {
				let region = navmesh.regions[i];
				for (let u = i+1; u<len; u++) {
					let region2 = navmesh.regions[u];
					if (region.s.upperWardCell && region2.s.upperWardCell && region.s.upperWardCell !== region2.s.upperWardCell && isOverlappingCells(region.s.upperWardCell, region2.s.upperWardCell)) {
						let mergedCell = mergeCellsNewHull(region.s.upperWardCell,  region2.s.upperWardCell);
						region.s.upperWardCell = mergedCell;
						region2.s.upperWardCell = mergedCell;
						g.append(this.makeSVG("path", {fill:"rgba(0,0,255,0.5)", "stroke-width":0.5, d: cellSVGString(mergedCell)}));
					}
				}
			}
		}

		let allUpperCells = new Set();
		for (let i=0; i<len; i++) {
			let region = navmesh.regions[i];
			if (region.s.upperWardCell) {
				allUpperCells.add(region.s.upperWardCell);
			}
		}

		allUpperCells = allUpperCells.values();
		let upperCellPolygons = [];
		for (let entry of allUpperCells) {
			let poly = cellToPolygon(entry);
			setPolygonAABB(poly);
			poly.r = entry;
			upperCellPolygons.push(poly);
		}


		// set any region small pillars supporting any upper ward cells
		for (let i=0; i<len; i++) {
			let region = navmesh.regions[i];
			let edge = region.edge;
			let upperWardCell = region.s.upperWardCell;

			if (!upperWardCell) {
				let supports = new Set();
				let supportsInfo = new Map();
				for (let entry of upperCellPolygons) {
					let containsTest;
					if ((containsTest=entry.contains(region.s.region.centroid)) || polygonWithinDistanceOf(entry, region.s.region.centroid, this.minPillarRadius)) {
						supports.add(entry.r);
						let dist = getShortestSqDistanceToEdge(entry, region.s.region.centroid);
						dist = Math.sqrt(dist);
						supportsInfo.set(entry.r, dist < this.minPillarRadius + this.pillarSpacing ?  !containsTest || dist <=this.minPillarRadius ? 2 : 1 : 0 );
						edge = edge.next;

					}
				}
				if (supports.size) {
					region.supports = supports;
					region.supportsInfo = supportsInfo;
				}
			}
		}

		// Connect neighbours pass
		for (let i=0; i<len; i++) {
			let region = navmesh.regions[i];
			let edge = region.edge;
			let upperWardCell = region.s.upperWardCell;

			do {
				if (edge.done || !edge.twin || edge.twin.polygon === (edge.prev.twin ? edge.prev.twin.polygon : null) ) {
					edge = edge.next;
					continue;
				}
				let region2 = edge.twin.polygon;
				let upperWardCell2 = region2.s.upperWardCell;

				edge.twin.done = true;
				edge.done = true;

				// Check if same upperward cell
				if (upperWardCell && upperWardCell === upperWardCell2) {
					edge = edge.next;
					continue;
				}

				// Check both small pillars within same cell
				if (region.supports && region2.supports && setsIntersection(region.supports, region2.supports).size) {
					edge = edge.next;
					continue;
				}

				// Check small pillar contained within upperward cell
				if (!!upperWardCell !== !!upperWardCell2) {
					let upperRegion = upperWardCell ? region : region2;
					let pillarRegion = (upperWardCell ? region2 : region);
					if ( pillarRegion.supports && pillarRegion.supports.has(upperRegion.s.upperWardCell) ) {
						let supportingPillarInfo = pillarRegion.supportsInfo.get(upperRegion.s.upperWardCell);
						if (supportingPillarInfo >= this.supportPillarBlockLevel) {
							g.append(this.makeSVG("circle", {r:0.5, fill:supportingPillarInfo === 2 ? "pink" : "orange", cx:pillarRegion.s.region.centroid.x, cy:pillarRegion.s.region.centroid.z}));
						}
						edge = edge.next;
						continue;
					}

				}

				// Link 'em up!
				lineSegment$3.set( edge.prev.vertex, edge.vertex );
				let t = lineSegment$3.closestPointToPointParameter(region.s.region.centroid, false);
				if (t >= 0 && t <= 1) {
					let distCheck = region.s.region.centroid.squaredDistanceTo(region2.s.region.centroid);
					if (distCheck <= maxBridgeSqDist2) { // distance check
						let needCheckpoint = distCheck <= maxBridgeSqDist;

						if (this.noBridgeAcrossCityWallRamp) ;
						if (this.noBridgeAcrossCityWall) ;

						// todo: perp/area-clip threshold check to link to either tower or edge of centroid

						// register
						g.append(this.makeSVG("path", {"stroke":`rgba(255,0,0,${needCheckpoint ? 1 : 0.3})`, "stroke-width":1, d:svgLineFromTo(region.s.region.centroid, region2.s.region.centroid) }));
					}

				}

				edge = edge.next;
			} while( edge !== region.edge)


			if (this.linkBridgesToHighways && (upperWardCell || !region.supports)) ;
		}

	}

	static resizeHullPoints(centerX, centerY, cell, maxRadius, minRadius) {
		let len = cell.length;
		let arr = [];
		let longestDist = 0;

		for (let i=0; i<len; i++) {
			let p = cell[i];
			let dx = p[0] - centerX;
			let dy = p[1] - centerY;
			let testLongestDist = dx*dx + dy*dy;
			if (testLongestDist > longestDist) {
				longestDist = testLongestDist;
			}
		}

		longestDist = 1/Math.sqrt(longestDist);
		for (let i=0; i<len; i++) {
			let p = cell[i];
			let dx = p[0] - centerX;
			let dy = p[1] - centerY;
			dx *= longestDist;
			dy *= longestDist;
			dx *= maxRadius;
			dy *= maxRadius;
			arr.push([centerX + dx, centerY + dy]);
		}

		let minRadiusSq = minRadius*minRadius;

		let prev = new Vector3();
		let cur = new Vector3();
		let centroid = new Vector3(centerX, 0, centerY);
		let lp = arr[len - 1];
		for (let i=0; i<len; i++) {
			let p = arr[i];
			prev.x = lp[0];
			prev.z = lp[1];
			cur.x = p[0];
			cur.z = p[1];
			lineSegment$3.set( prev, cur );

			let t = lineSegment$3.closestPointToPointParameter( centroid, false);
			lineSegment$3.at( t, pointOnLineSegment$2 );
			let distance = pointOnLineSegment$2.squaredDistanceTo( centroid );
			if (distance < minRadiusSq) {
				let px = pointOnLineSegment$2.x - centerX;
				let py = pointOnLineSegment$2.z - centerY;
				let d = Math.sqrt(distance);
				px /= d;
				py /= d;
				px *= minRadius;
				py *= minRadius;

				let dx;
				let dy;
				let sc;
				dx = p[0] - centerX;
				dy = p[1] - centerY;
				d = Math.sqrt(dx*dx + dy*dy);
				dx /= d;
				dy /= d;
				sc = dx * px + dy * py;

				dx *= sc;
				dy *= sc;
				p[0] += dx;
				p[1] +=  dy;

				dx = lp[0] - centerX;
				dy = lp[1] - centerY;
				d = Math.sqrt(dx*dx + dy*dy);
				dx /= d;
				dy /= d;
				sc = dx * px + dy * py;
				dx *= sc;
				dy *= sc;
				lp[0] +=  dx;
				lp[1] +=  dy;
			}
			lp = p;
		}
		return arr;
	}

	static getEmptyRegionsFromNavmesh(navmesh, minRadius, maxRadius) {
		let map = new Map();
		minRadius *= minRadius;
		maxRadius *= maxRadius;


		let len = navmesh.regions.length;
		for (let i=0; i<len; i++) {
			let r = navmesh.regions[i];

			let edge = r.edge;
			let beyondMaxRadius = true;
			let isValid = true;
			do {
				lineSegment$3.set( edge.prev.vertex, edge.vertex );

				let t = lineSegment$3.closestPointToPointParameter( r.centroid, false);
				lineSegment$3.at( t, pointOnLineSegment$2 );
				let distance = pointOnLineSegment$2.squaredDistanceTo( r.centroid );

				if (distance >= minRadius) {
					if (distance < maxRadius) {
						beyondMaxRadius = false;
					}
				} else {
					isValid = false;
					break;
				}

				edge = edge.next;
			} while( edge !== r.edge);

			if (isValid) {
				map.set(r, beyondMaxRadius);
			}
		}

		return map;
	}

	filterTriangles(points, triangles, cancelingMethod, del) {
		//let filtered = new Uint32Array();
		let filteredArr = [];
		let len = triangles.length;
		let cx;
		let cy;

		let count = 0;
		samplePt.z = 0;
		for (let i=0; i<len; i+=3) {
			cx = points[(triangles[i] << 1)];
			cy = points[(triangles[i] << 1)+1];

			cx += points[(triangles[i+1] << 1)];
			cy += points[(triangles[i+1] << 1)+1];

			cx += points[(triangles[i+2] << 1)];
			cy += points[(triangles[i+2] << 1)+1];
			cx /=3;
			cy /=3;

			samplePt.x = cx;
			samplePt.z = cy;

			if (!cancelingMethod(samplePt)) {
				filteredArr[count++] = triangles[i];
				filteredArr[count++] = triangles[i+1];
				filteredArr[count++] = triangles[i+2];
			}
		}

		let filtered = Uint32Array.from(filteredArr);

		if (del) {
			let oldOne = del ? del.triangles : filtered;
			del.triangles = filtered;

			return oldOne;
		}
		return filtered;
	}

	// array of buildings
	setupNeighborhoodFromPath(pathStr, wardObj, indexTrace, wardObjVertices) {
		let buildings = pathStr.split("M ");
		if (buildings[0] === "") buildings.shift();

		let i;
		let len = buildings.length;
		let arr;
		var newPathStr = "";


		let building;
		let closePath;
		let buildingsList = [];

		let pointsForNeighborhood = [];

		// polygons per building

		for (i=0; i<len; i++) {
			building = buildings[i];
			building = building.trim();
			closePath = building.charAt(building.length-1) === "Z";
			if (closePath) {
				building = building.slice(0, building.length-1).trim();
			}
			arr = building.split("L ");
			if (arr[0] === "") arr.shift();

			let v;
			let x;
			let lx;
			let ly;
			let y;
			let dx;
			let dy;

			let count = 0;
			let vLen = arr.length;
			let pointsForBuilding = [];
			let buildingPts = [];
			let addedStr;

			let pArr;
			let initArr = [];

			for (v=0; v<vLen; v++) {
				pArr = arr[v].split(",");
				pArr = pArr.map((p=>{return parseFloat(p.trim())}));
				pArr.length = 2;

				x = pArr[0];
				y = pArr[1];

				dx = x- lx;
				dy = y - ly;


				if (v===0 || dx*dx+dy*dy>=this.sqWeldDistThreshold) {
					lx = x;
					ly = y;
					initArr.push(pArr);
				}

			}


			//initArr.reverse();

			vLen = initArr.length;

			let vArr = [];

			for (v=0; v<vLen; v++) {
				if (!collinear(initArr[v>=1 ? v - 1 : vLen - 1], initArr[v], initArr[v < vLen - 1 ? v+1 : 0], this.collinearThreshold)) {
					vArr.push(initArr[v]);
				}
			}

			vLen = vArr.length;

			if (vLen <= 4) {
				// todo: redone building string
				newPathStr += (addedStr = "M "+building + " Z");
				for (v=0; v<vLen; v++) {

					wardObjVertices.push(vArr[v]);
					buildingPts.push(vArr[v]);
					pointsForNeighborhood.push(vArr[v]);
					/*
					if (vLen !== initArr.length && vLen>=5) {
						// exception
					}
					*/


					count++;

				}

			} else {
				for (v=0; v<vLen; v++) {
					pointsForBuilding.push(vArr[v]);
				}
				// calculate convex hull

				var del = Delaunay.from(pointsForBuilding);
				addedStr = del.renderHull();
				newPathStr += addedStr;  //  + "Z"

				arr = addedStr.slice(1).split("L");

				//console.log(arr.length + " VS " + vLen  + " :: "+indexTrace+","+i);
				vLen = arr.length;

				for (v=0; v<vLen; v++) {
					let pArr = arr[v].split(",");
					pArr = pArr.map((p=>{return parseFloat(p.trim())}));

					/*
					if (vLen !== initArr.length && vLen>=5)  {
						// exception
					}
					*/

					wardObjVertices.push(pArr);
					buildingPts.push(pArr);
					pointsForNeighborhood.push(pArr);
					count++;

				}

			}





			if (count > 4) ; else if (count < 3) {
				console.warn("Degenerate path found!");
			}

			buildingsList.push(buildingPts);

		}

		var del = Delaunay.from(pointsForNeighborhood);
		let hullPoints = pointsFromDelHull(del);

		var g = $(this.makeSVG("g", {}));
		this.map.append(g, {});
		g.append(this.makeSVG("path", {fill:"none", "stroke-width":0.3, "stroke":"turquoise", d:del.renderHull()}));



		wardObj.neighborhoodHulls.push(hullPoints);
		wardObj.neighborhoodPts.push(buildingsList);
		return newPathStr;

	}

}

export { AABB, AStar, AlignmentBehavior, ArriveBehavior, BFS, BVH, BVHNode, BoundingSphere, Face as CHFace, Vertex as CHVertex, VertexList as CHVertexList, Cell, CellSpacePartitioning, CohesionBehavior, CompositeGoal, ConvexHull, Corridor, CostTable, DFS, Dijkstra, Edge, EntityManager, EvadeBehavior, EventDispatcher, FleeBehavior, FlowAgent, FlowTriangulate, FlowVertex, FollowPathBehavior, FuzzyAND, FuzzyCompositeTerm, FuzzyFAIRLY, FuzzyModule, FuzzyOR, FuzzyRule, FuzzySet, FuzzyTerm, FuzzyVERY, FuzzyVariable, GameEntity, Goal, GoalEvaluator, Graph, GraphUtils, HalfEdge, HeuristicPolicyDijkstra, HeuristicPolicyEuclid, HeuristicPolicyEuclidSquared, HeuristicPolicyManhattan, InterposeBehavior, LeftSCurveFuzzySet, LeftShoulderFuzzySet, LineSegment, Logger, MathUtils, Matrix3, Matrix4, MemoryRecord, MemorySystem, MeshGeometry, MessageDispatcher, MovingEntity, NavEdge, NavMesh, NavMeshFlowField, NavMeshFlowFieldBehavior, NavMeshLoader, NavNode, Node, NormalDistFuzzySet, OBB, ObstacleAvoidanceBehavior, OffsetPursuitBehavior, OnPathBehavior, Path, Plane, Polygon, Polyhedron, PriorityQueue, PursuitBehavior, Quaternion, Ray, RectangularTriggerRegion, Regulator, RightSCurveFuzzySet, RightShoulderFuzzySet, SAT, SVGCityReader, SeekBehavior, SeparationBehavior, SingletonFuzzySet, Smoother, SphericalTriggerRegion, State, StateMachine, SteeringBehavior, SteeringManager, Task, TaskQueue, Telegram, Think, Time, TriangularFuzzySet, Trigger, TriggerRegion, Vector3, Vehicle, Vision, WanderBehavior, WorldUp };
