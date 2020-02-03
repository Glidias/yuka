
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
const plane = new Plane();
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
		plane.fromCoplanarPoints( v0.point, v1.point, v2.point );

		for ( let i = 0, l = vertices.length; i < l; i ++ ) {

			const vertex = vertices[ i ];

			if ( vertex !== v0 && vertex !== v1 && vertex !== v2 ) {

				distance = Math.abs( plane.distanceToPoint( vertex.point ) );

				if ( distance > maxDistance ) {

					maxDistance = distance;
					v3 = vertex;

				}

			}

		}

		// handle case where all points lie in one plane

		if ( plane.distanceToPoint( v3.point ) === 0 ) {

			throw 'ERROR: YUKA.ConvexHull: All extreme points lie in a single plane. Unable to compute convex hull.';

		}

		// build initial tetrahedron

		const faces = this.faces;

		if ( plane.distanceToPoint( v3.point ) < 0 ) {

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

const xAxis = new Vector3();
const yAxis = new Vector3();
const zAxis = new Vector3();
const v1$3 = new Vector3();
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

		v1$3.subVectors( point, this.center );
		this.rotation.extractBasis( xAxis, yAxis, zAxis );

		// start at the center position of the OBB

		result.copy( this.center );

		// project the target onto the OBB axes and walk towards that point

		const x = MathUtils.clamp( v1$3.dot( xAxis ), - halfSizes.x, halfSizes.x );
		result.add( xAxis.multiplyScalar( x ) );

		const y = MathUtils.clamp( v1$3.dot( yAxis ), - halfSizes.y, halfSizes.y );
		result.add( yAxis.multiplyScalar( y ) );

		const z = MathUtils.clamp( v1$3.dot( zAxis ), - halfSizes.z, halfSizes.z );
		result.add( zAxis.multiplyScalar( z ) );

		return result;

	}

	/**
	* Returns true if the given point is inside this OBB.
	*
	* @param {Vector3} point - A point in 3D space.
	* @return {Boolean} Whether the given point is inside this OBB or not.
	*/
	containsPoint( point ) {

		v1$3.subVectors( point, this.center );
		this.rotation.extractBasis( xAxis, yAxis, zAxis );

		// project v1 onto each axis and check if these points lie inside the OBB

		return Math.abs( v1$3.dot( xAxis ) ) <= this.halfSizes.x &&
				Math.abs( v1$3.dot( yAxis ) ) <= this.halfSizes.y &&
				Math.abs( v1$3.dot( zAxis ) ) <= this.halfSizes.z;

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

		v1$3.subVectors( b.c, a.c );

		// bring translation into a’s coordinate frame

		t[ 0 ] = v1$3.dot( a.u[ 0 ] );
		t[ 1 ] = v1$3.dot( a.u[ 1 ] );
		t[ 2 ] = v1$3.dot( a.u[ 2 ] );

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

		this.rotation.extractBasis( xAxis, yAxis, zAxis );

		// compute the projection interval radius of this OBB onto L(t) = this->center + t * p.normal;

		const r = this.halfSizes.x * Math.abs( plane.normal.dot( xAxis ) ) +
				this.halfSizes.y * Math.abs( plane.normal.dot( yAxis ) ) +
				this.halfSizes.z * Math.abs( plane.normal.dot( zAxis ) );

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
const lineSegment$1 = new LineSegment();
function clampPointWithinRegion(region, point) {
	let edge = region.edge;
	let minDistance = Infinity;

	// consider todo: alternate faster implementation with edge perp dot product checks?
	do {
		lineSegment$1.set( edge.prev.vertex, edge.vertex );
		const t = lineSegment$1.closestPointToPointParameter( point );
		lineSegment$1.at( t, pointOnLineSegment$1 );
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

function unwrapExports (x) {
	return x && x.__esModule && Object.prototype.hasOwnProperty.call(x, 'default') ? x['default'] : x;
}

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

var clipper = createCommonjsModule(function (module) {
/*******************************************************************************
 *                                                                              *
 * Author    :  Angus Johnson                                                   *
 * Version   :  6.4.2                                                           *
 * Date      :  27 February 2017                                                *
 * Website   :  http://www.angusj.com                                           *
 * Copyright :  Angus Johnson 2010-2017                                         *
 *                                                                              *
 * License:                                                                     *
 * Use, modification & distribution is subject to Boost Software License Ver 1. *
 * http://www.boost.org/LICENSE_1_0.txt                                         *
 *                                                                              *
 * Attributions:                                                                *
 * The code in this library is an extension of Bala Vatti's clipping algorithm: *
 * "A generic solution to polygon clipping"                                     *
 * Communications of the ACM, Vol 35, Issue 7 (July 1992) pp 56-63.             *
 * http://portal.acm.org/citation.cfm?id=129906                                 *
 *                                                                              *
 * Computer graphics and geometric modeling: implementation and algorithms      *
 * By Max K. Agoston                                                            *
 * Springer; 1 edition (January 4, 2005)                                        *
 * http://books.google.com/books?q=vatti+clipping+agoston                       *
 *                                                                              *
 * See also:                                                                    *
 * "Polygon Offsetting by Computing Winding Numbers"                            *
 * Paper no. DETC2005-85513 pp. 565-575                                         *
 * ASME 2005 International Design Engineering Technical Conferences             *
 * and Computers and Information in Engineering Conference (IDETC/CIE2005)      *
 * September 24-28, 2005 , Long Beach, California, USA                          *
 * http://www.me.berkeley.edu/~mcmains/pubs/DAC05OffsetPolygon.pdf              *
 *                                                                              *
 *******************************************************************************/
/*******************************************************************************
 *                                                                              *
 * Author    :  Timo                                                            *
 * Version   :  6.4.2.2                                                         *
 * Date      :  8 September 2017                                                 *
 *                                                                              *
 * This is a translation of the C# Clipper library to Javascript.               *
 * Int128 struct of C# is implemented using JSBN of Tom Wu.                     *
 * Because Javascript lacks support for 64-bit integers, the space              *
 * is a little more restricted than in C# version.                              *
 *                                                                              *
 * C# version has support for coordinate space:                                 *
 * +-4611686018427387903 ( sqrt(2^127 -1)/2 )                                   *
 * while Javascript version has support for space:                              *
 * +-4503599627370495 ( sqrt(2^106 -1)/2 )                                      *
 *                                                                              *
 * Tom Wu's JSBN proved to be the fastest big integer library:                  *
 * http://jsperf.com/big-integer-library-test                                   *
 *                                                                              *
 * This class can be made simpler when (if ever) 64-bit integer support comes   *
 * or floating point Clipper is released.                                       *
 *                                                                              *
 *******************************************************************************/
/*******************************************************************************
 *                                                                              *
 * Basic JavaScript BN library - subset useful for RSA encryption.              *
 * http://www-cs-students.stanford.edu/~tjw/jsbn/                               *
 * Copyright (c) 2005  Tom Wu                                                   *
 * All Rights Reserved.                                                         *
 * See "LICENSE" for details:                                                   *
 * http://www-cs-students.stanford.edu/~tjw/jsbn/LICENSE                        *
 *                                                                              *
 *******************************************************************************/
(function ()
{
	var ClipperLib = {};
	ClipperLib.version = '6.4.2.2';

	//UseLines: Enables open path clipping. Adds a very minor cost to performance.
	ClipperLib.use_lines = true;

	//ClipperLib.use_xyz: adds a Z member to IntPoint. Adds a minor cost to performance.
	ClipperLib.use_xyz = false;

	var isNode = false;
	if (module.exports)
	{
		module.exports = ClipperLib;
		isNode = true;
	}
	else
	{
		if (typeof (document) !== "undefined") window.ClipperLib = ClipperLib;
		else self['ClipperLib'] = ClipperLib;
	}
	var navigator_appName;
	if (!isNode)
	{
		var nav = navigator.userAgent.toString().toLowerCase();
		navigator_appName = navigator.appName;
	}
	else
	{
		var nav = "chrome"; // Node.js uses Chrome's V8 engine
		navigator_appName = "Netscape"; // Firefox, Chrome and Safari returns "Netscape", so Node.js should also
	}
	// Browser test to speedup performance critical functions
	var browser = {};

	if (nav.indexOf("chrome") != -1 && nav.indexOf("chromium") == -1) browser.chrome = 1;
	else browser.chrome = 0;
	if (nav.indexOf("chromium") != -1) browser.chromium = 1;
	else browser.chromium = 0;
	if (nav.indexOf("safari") != -1 && nav.indexOf("chrome") == -1 && nav.indexOf("chromium") == -1) browser.safari = 1;
	else browser.safari = 0;
	if (nav.indexOf("firefox") != -1) browser.firefox = 1;
	else browser.firefox = 0;
	if (nav.indexOf("firefox/17") != -1) browser.firefox17 = 1;
	else browser.firefox17 = 0;
	if (nav.indexOf("firefox/15") != -1) browser.firefox15 = 1;
	else browser.firefox15 = 0;
	if (nav.indexOf("firefox/3") != -1) browser.firefox3 = 1;
	else browser.firefox3 = 0;
	if (nav.indexOf("opera") != -1) browser.opera = 1;
	else browser.opera = 0;
	if (nav.indexOf("msie 10") != -1) browser.msie10 = 1;
	else browser.msie10 = 0;
	if (nav.indexOf("msie 9") != -1) browser.msie9 = 1;
	else browser.msie9 = 0;
	if (nav.indexOf("msie 8") != -1) browser.msie8 = 1;
	else browser.msie8 = 0;
	if (nav.indexOf("msie 7") != -1) browser.msie7 = 1;
	else browser.msie7 = 0;
	if (nav.indexOf("msie ") != -1) browser.msie = 1;
	else browser.msie = 0;
	ClipperLib.biginteger_used = null;

	// Copyright (c) 2005  Tom Wu
	// All Rights Reserved.
	// See "LICENSE" for details.
	// Basic JavaScript BN library - subset useful for RSA encryption.
	// Bits per digit
	var dbits;
	// (public) Constructor
	/**
	* @constructor
	*/
	function BigInteger(a, b, c)
	{
		// This test variable can be removed,
		// but at least for performance tests it is useful piece of knowledge
		// This is the only ClipperLib related variable in BigInteger library
		ClipperLib.biginteger_used = 1;
		if (a != null)
			if ("number" == typeof a && "undefined" == typeof (b)) this.fromInt(a); // faster conversion
			else if ("number" == typeof a) this.fromNumber(a, b, c);
		else if (b == null && "string" != typeof a) this.fromString(a, 256);
		else this.fromString(a, b);
	}
	// return new, unset BigInteger
	function nbi()
	{
		return new BigInteger(null, undefined, undefined);
	}
	// am: Compute w_j += (x*this_i), propagate carries,
	// c is initial carry, returns final carry.
	// c < 3*dvalue, x < 2*dvalue, this_i < dvalue
	// We need to select the fastest one that works in this environment.
	// am1: use a single mult and divide to get the high bits,
	// max digit bits should be 26 because
	// max internal value = 2*dvalue^2-2*dvalue (< 2^53)
	function am1(i, x, w, j, c, n)
	{
		while (--n >= 0)
		{
			var v = x * this[i++] + w[j] + c;
			c = Math.floor(v / 0x4000000);
			w[j++] = v & 0x3ffffff;
		}
		return c;
	}
	// am2 avoids a big mult-and-extract completely.
	// Max digit bits should be <= 30 because we do bitwise ops
	// on values up to 2*hdvalue^2-hdvalue-1 (< 2^31)
	function am2(i, x, w, j, c, n)
	{
		var xl = x & 0x7fff,
			xh = x >> 15;
		while (--n >= 0)
		{
			var l = this[i] & 0x7fff;
			var h = this[i++] >> 15;
			var m = xh * l + h * xl;
			l = xl * l + ((m & 0x7fff) << 15) + w[j] + (c & 0x3fffffff);
			c = (l >>> 30) + (m >>> 15) + xh * h + (c >>> 30);
			w[j++] = l & 0x3fffffff;
		}
		return c;
	}
	// Alternately, set max digit bits to 28 since some
	// browsers slow down when dealing with 32-bit numbers.
	function am3(i, x, w, j, c, n)
	{
		var xl = x & 0x3fff,
			xh = x >> 14;
		while (--n >= 0)
		{
			var l = this[i] & 0x3fff;
			var h = this[i++] >> 14;
			var m = xh * l + h * xl;
			l = xl * l + ((m & 0x3fff) << 14) + w[j] + c;
			c = (l >> 28) + (m >> 14) + xh * h;
			w[j++] = l & 0xfffffff;
		}
		return c;
	}
	if (navigator_appName == "Microsoft Internet Explorer")
	{
		BigInteger.prototype.am = am2;
		dbits = 30;
	}
	else if (navigator_appName != "Netscape")
	{
		BigInteger.prototype.am = am1;
		dbits = 26;
	}
	else
	{ // Mozilla/Netscape seems to prefer am3
		BigInteger.prototype.am = am3;
		dbits = 28;
	}
	BigInteger.prototype.DB = dbits;
	BigInteger.prototype.DM = ((1 << dbits) - 1);
	BigInteger.prototype.DV = (1 << dbits);
	var BI_FP = 52;
	BigInteger.prototype.FV = Math.pow(2, BI_FP);
	BigInteger.prototype.F1 = BI_FP - dbits;
	BigInteger.prototype.F2 = 2 * dbits - BI_FP;
	// Digit conversions
	var BI_RM = "0123456789abcdefghijklmnopqrstuvwxyz";
	var BI_RC = new Array();
	var rr, vv;
	rr = "0".charCodeAt(0);
	for (vv = 0; vv <= 9; ++vv) BI_RC[rr++] = vv;
	rr = "a".charCodeAt(0);
	for (vv = 10; vv < 36; ++vv) BI_RC[rr++] = vv;
	rr = "A".charCodeAt(0);
	for (vv = 10; vv < 36; ++vv) BI_RC[rr++] = vv;

	function int2char(n)
	{
		return BI_RM.charAt(n);
	}

	function intAt(s, i)
	{
		var c = BI_RC[s.charCodeAt(i)];
		return (c == null) ? -1 : c;
	}
	// (protected) copy this to r
	function bnpCopyTo(r)
	{
		for (var i = this.t - 1; i >= 0; --i) r[i] = this[i];
		r.t = this.t;
		r.s = this.s;
	}
	// (protected) set from integer value x, -DV <= x < DV
	function bnpFromInt(x)
	{
		this.t = 1;
		this.s = (x < 0) ? -1 : 0;
		if (x > 0) this[0] = x;
		else if (x < -1) this[0] = x + this.DV;
		else this.t = 0;
	}
	// return bigint initialized to value
	function nbv(i)
	{
		var r = nbi();
		r.fromInt(i);
		return r;
	}
	// (protected) set from string and radix
	function bnpFromString(s, b)
	{
		var k;
		if (b == 16) k = 4;
		else if (b == 8) k = 3;
		else if (b == 256) k = 8; // byte array
		else if (b == 2) k = 1;
		else if (b == 32) k = 5;
		else if (b == 4) k = 2;
		else
		{
			this.fromRadix(s, b);
			return;
		}
		this.t = 0;
		this.s = 0;
		var i = s.length,
			mi = false,
			sh = 0;
		while (--i >= 0)
		{
			var x = (k == 8) ? s[i] & 0xff : intAt(s, i);
			if (x < 0)
			{
				if (s.charAt(i) == "-") mi = true;
				continue;
			}
			mi = false;
			if (sh == 0)
				this[this.t++] = x;
			else if (sh + k > this.DB)
			{
				this[this.t - 1] |= (x & ((1 << (this.DB - sh)) - 1)) << sh;
				this[this.t++] = (x >> (this.DB - sh));
			}
			else
				this[this.t - 1] |= x << sh;
			sh += k;
			if (sh >= this.DB) sh -= this.DB;
		}
		if (k == 8 && (s[0] & 0x80) != 0)
		{
			this.s = -1;
			if (sh > 0) this[this.t - 1] |= ((1 << (this.DB - sh)) - 1) << sh;
		}
		this.clamp();
		if (mi) BigInteger.ZERO.subTo(this, this);
	}
	// (protected) clamp off excess high words
	function bnpClamp()
	{
		var c = this.s & this.DM;
		while (this.t > 0 && this[this.t - 1] == c) --this.t;
	}
	// (public) return string representation in given radix
	function bnToString(b)
	{
		if (this.s < 0) return "-" + this.negate().toString(b);
		var k;
		if (b == 16) k = 4;
		else if (b == 8) k = 3;
		else if (b == 2) k = 1;
		else if (b == 32) k = 5;
		else if (b == 4) k = 2;
		else return this.toRadix(b);
		var km = (1 << k) - 1,
			d, m = false,
			r = "",
			i = this.t;
		var p = this.DB - (i * this.DB) % k;
		if (i-- > 0)
		{
			if (p < this.DB && (d = this[i] >> p) > 0)
			{
				m = true;
				r = int2char(d);
			}
			while (i >= 0)
			{
				if (p < k)
				{
					d = (this[i] & ((1 << p) - 1)) << (k - p);
					d |= this[--i] >> (p += this.DB - k);
				}
				else
				{
					d = (this[i] >> (p -= k)) & km;
					if (p <= 0)
					{
						p += this.DB;
						--i;
					}
				}
				if (d > 0) m = true;
				if (m) r += int2char(d);
			}
		}
		return m ? r : "0";
	}
	// (public) -this
	function bnNegate()
	{
		var r = nbi();
		BigInteger.ZERO.subTo(this, r);
		return r;
	}
	// (public) |this|
	function bnAbs()
	{
		return (this.s < 0) ? this.negate() : this;
	}
	// (public) return + if this > a, - if this < a, 0 if equal
	function bnCompareTo(a)
	{
		var r = this.s - a.s;
		if (r != 0) return r;
		var i = this.t;
		r = i - a.t;
		if (r != 0) return (this.s < 0) ? -r : r;
		while (--i >= 0)
			if ((r = this[i] - a[i]) != 0) return r;
		return 0;
	}
	// returns bit length of the integer x
	function nbits(x)
	{
		var r = 1,
			t;
		if ((t = x >>> 16) != 0)
		{
			x = t;
			r += 16;
		}
		if ((t = x >> 8) != 0)
		{
			x = t;
			r += 8;
		}
		if ((t = x >> 4) != 0)
		{
			x = t;
			r += 4;
		}
		if ((t = x >> 2) != 0)
		{
			x = t;
			r += 2;
		}
		if ((t = x >> 1) != 0)
		{
			x = t;
			r += 1;
		}
		return r;
	}
	// (public) return the number of bits in "this"
	function bnBitLength()
	{
		if (this.t <= 0) return 0;
		return this.DB * (this.t - 1) + nbits(this[this.t - 1] ^ (this.s & this.DM));
	}
	// (protected) r = this << n*DB
	function bnpDLShiftTo(n, r)
	{
		var i;
		for (i = this.t - 1; i >= 0; --i) r[i + n] = this[i];
		for (i = n - 1; i >= 0; --i) r[i] = 0;
		r.t = this.t + n;
		r.s = this.s;
	}
	// (protected) r = this >> n*DB
	function bnpDRShiftTo(n, r)
	{
		for (var i = n; i < this.t; ++i) r[i - n] = this[i];
		r.t = Math.max(this.t - n, 0);
		r.s = this.s;
	}
	// (protected) r = this << n
	function bnpLShiftTo(n, r)
	{
		var bs = n % this.DB;
		var cbs = this.DB - bs;
		var bm = (1 << cbs) - 1;
		var ds = Math.floor(n / this.DB),
			c = (this.s << bs) & this.DM,
			i;
		for (i = this.t - 1; i >= 0; --i)
		{
			r[i + ds + 1] = (this[i] >> cbs) | c;
			c = (this[i] & bm) << bs;
		}
		for (i = ds - 1; i >= 0; --i) r[i] = 0;
		r[ds] = c;
		r.t = this.t + ds + 1;
		r.s = this.s;
		r.clamp();
	}
	// (protected) r = this >> n
	function bnpRShiftTo(n, r)
	{
		r.s = this.s;
		var ds = Math.floor(n / this.DB);
		if (ds >= this.t)
		{
			r.t = 0;
			return;
		}
		var bs = n % this.DB;
		var cbs = this.DB - bs;
		var bm = (1 << bs) - 1;
		r[0] = this[ds] >> bs;
		for (var i = ds + 1; i < this.t; ++i)
		{
			r[i - ds - 1] |= (this[i] & bm) << cbs;
			r[i - ds] = this[i] >> bs;
		}
		if (bs > 0) r[this.t - ds - 1] |= (this.s & bm) << cbs;
		r.t = this.t - ds;
		r.clamp();
	}
	// (protected) r = this - a
	function bnpSubTo(a, r)
	{
		var i = 0,
			c = 0,
			m = Math.min(a.t, this.t);
		while (i < m)
		{
			c += this[i] - a[i];
			r[i++] = c & this.DM;
			c >>= this.DB;
		}
		if (a.t < this.t)
		{
			c -= a.s;
			while (i < this.t)
			{
				c += this[i];
				r[i++] = c & this.DM;
				c >>= this.DB;
			}
			c += this.s;
		}
		else
		{
			c += this.s;
			while (i < a.t)
			{
				c -= a[i];
				r[i++] = c & this.DM;
				c >>= this.DB;
			}
			c -= a.s;
		}
		r.s = (c < 0) ? -1 : 0;
		if (c < -1) r[i++] = this.DV + c;
		else if (c > 0) r[i++] = c;
		r.t = i;
		r.clamp();
	}
	// (protected) r = this * a, r != this,a (HAC 14.12)
	// "this" should be the larger one if appropriate.
	function bnpMultiplyTo(a, r)
	{
		var x = this.abs(),
			y = a.abs();
		var i = x.t;
		r.t = i + y.t;
		while (--i >= 0) r[i] = 0;
		for (i = 0; i < y.t; ++i) r[i + x.t] = x.am(0, y[i], r, i, 0, x.t);
		r.s = 0;
		r.clamp();
		if (this.s != a.s) BigInteger.ZERO.subTo(r, r);
	}
	// (protected) r = this^2, r != this (HAC 14.16)
	function bnpSquareTo(r)
	{
		var x = this.abs();
		var i = r.t = 2 * x.t;
		while (--i >= 0) r[i] = 0;
		for (i = 0; i < x.t - 1; ++i)
		{
			var c = x.am(i, x[i], r, 2 * i, 0, 1);
			if ((r[i + x.t] += x.am(i + 1, 2 * x[i], r, 2 * i + 1, c, x.t - i - 1)) >= x.DV)
			{
				r[i + x.t] -= x.DV;
				r[i + x.t + 1] = 1;
			}
		}
		if (r.t > 0) r[r.t - 1] += x.am(i, x[i], r, 2 * i, 0, 1);
		r.s = 0;
		r.clamp();
	}
	// (protected) divide this by m, quotient and remainder to q, r (HAC 14.20)
	// r != q, this != m.  q or r may be null.
	function bnpDivRemTo(m, q, r)
	{
		var pm = m.abs();
		if (pm.t <= 0) return;
		var pt = this.abs();
		if (pt.t < pm.t)
		{
			if (q != null) q.fromInt(0);
			if (r != null) this.copyTo(r);
			return;
		}
		if (r == null) r = nbi();
		var y = nbi(),
			ts = this.s,
			ms = m.s;
		var nsh = this.DB - nbits(pm[pm.t - 1]); // normalize modulus
		if (nsh > 0)
		{
			pm.lShiftTo(nsh, y);
			pt.lShiftTo(nsh, r);
		}
		else
		{
			pm.copyTo(y);
			pt.copyTo(r);
		}
		var ys = y.t;
		var y0 = y[ys - 1];
		if (y0 == 0) return;
		var yt = y0 * (1 << this.F1) + ((ys > 1) ? y[ys - 2] >> this.F2 : 0);
		var d1 = this.FV / yt,
			d2 = (1 << this.F1) / yt,
			e = 1 << this.F2;
		var i = r.t,
			j = i - ys,
			t = (q == null) ? nbi() : q;
		y.dlShiftTo(j, t);
		if (r.compareTo(t) >= 0)
		{
			r[r.t++] = 1;
			r.subTo(t, r);
		}
		BigInteger.ONE.dlShiftTo(ys, t);
		t.subTo(y, y); // "negative" y so we can replace sub with am later
		while (y.t < ys) y[y.t++] = 0;
		while (--j >= 0)
		{
			// Estimate quotient digit
			var qd = (r[--i] == y0) ? this.DM : Math.floor(r[i] * d1 + (r[i - 1] + e) * d2);
			if ((r[i] += y.am(0, qd, r, j, 0, ys)) < qd)
			{ // Try it out
				y.dlShiftTo(j, t);
				r.subTo(t, r);
				while (r[i] < --qd) r.subTo(t, r);
			}
		}
		if (q != null)
		{
			r.drShiftTo(ys, q);
			if (ts != ms) BigInteger.ZERO.subTo(q, q);
		}
		r.t = ys;
		r.clamp();
		if (nsh > 0) r.rShiftTo(nsh, r); // Denormalize remainder
		if (ts < 0) BigInteger.ZERO.subTo(r, r);
	}
	// (public) this mod a
	function bnMod(a)
	{
		var r = nbi();
		this.abs().divRemTo(a, null, r);
		if (this.s < 0 && r.compareTo(BigInteger.ZERO) > 0) a.subTo(r, r);
		return r;
	}
	// Modular reduction using "classic" algorithm
	/**
	* @constructor
	*/
	function Classic(m)
	{
		this.m = m;
	}

	function cConvert(x)
	{
		if (x.s < 0 || x.compareTo(this.m) >= 0) return x.mod(this.m);
		else return x;
	}

	function cRevert(x)
	{
		return x;
	}

	function cReduce(x)
	{
		x.divRemTo(this.m, null, x);
	}

	function cMulTo(x, y, r)
	{
		x.multiplyTo(y, r);
		this.reduce(r);
	}

	function cSqrTo(x, r)
	{
		x.squareTo(r);
		this.reduce(r);
	}
	Classic.prototype.convert = cConvert;
	Classic.prototype.revert = cRevert;
	Classic.prototype.reduce = cReduce;
	Classic.prototype.mulTo = cMulTo;
	Classic.prototype.sqrTo = cSqrTo;
	// (protected) return "-1/this % 2^DB"; useful for Mont. reduction
	// justification:
	//         xy == 1 (mod m)
	//         xy =  1+km
	//   xy(2-xy) = (1+km)(1-km)
	// x[y(2-xy)] = 1-k^2m^2
	// x[y(2-xy)] == 1 (mod m^2)
	// if y is 1/x mod m, then y(2-xy) is 1/x mod m^2
	// should reduce x and y(2-xy) by m^2 at each step to keep size bounded.
	// JS multiply "overflows" differently from C/C++, so care is needed here.
	function bnpInvDigit()
	{
		if (this.t < 1) return 0;
		var x = this[0];
		if ((x & 1) == 0) return 0;
		var y = x & 3; // y == 1/x mod 2^2
		y = (y * (2 - (x & 0xf) * y)) & 0xf; // y == 1/x mod 2^4
		y = (y * (2 - (x & 0xff) * y)) & 0xff; // y == 1/x mod 2^8
		y = (y * (2 - (((x & 0xffff) * y) & 0xffff))) & 0xffff; // y == 1/x mod 2^16
		// last step - calculate inverse mod DV directly;
		// assumes 16 < DB <= 32 and assumes ability to handle 48-bit ints
		y = (y * (2 - x * y % this.DV)) % this.DV; // y == 1/x mod 2^dbits
		// we really want the negative inverse, and -DV < y < DV
		return (y > 0) ? this.DV - y : -y;
	}
	// Montgomery reduction
	/**
	* @constructor
	*/
	function Montgomery(m)
	{
		this.m = m;
		this.mp = m.invDigit();
		this.mpl = this.mp & 0x7fff;
		this.mph = this.mp >> 15;
		this.um = (1 << (m.DB - 15)) - 1;
		this.mt2 = 2 * m.t;
	}
	// xR mod m
	function montConvert(x)
	{
		var r = nbi();
		x.abs().dlShiftTo(this.m.t, r);
		r.divRemTo(this.m, null, r);
		if (x.s < 0 && r.compareTo(BigInteger.ZERO) > 0) this.m.subTo(r, r);
		return r;
	}
	// x/R mod m
	function montRevert(x)
	{
		var r = nbi();
		x.copyTo(r);
		this.reduce(r);
		return r;
	}
	// x = x/R mod m (HAC 14.32)
	function montReduce(x)
	{
		while (x.t <= this.mt2) // pad x so am has enough room later
			x[x.t++] = 0;
		for (var i = 0; i < this.m.t; ++i)
		{
			// faster way of calculating u0 = x[i]*mp mod DV
			var j = x[i] & 0x7fff;
			var u0 = (j * this.mpl + (((j * this.mph + (x[i] >> 15) * this.mpl) & this.um) << 15)) & x.DM;
			// use am to combine the multiply-shift-add into one call
			j = i + this.m.t;
			x[j] += this.m.am(0, u0, x, i, 0, this.m.t);
			// propagate carry
			while (x[j] >= x.DV)
			{
				x[j] -= x.DV;
				x[++j]++;
			}
		}
		x.clamp();
		x.drShiftTo(this.m.t, x);
		if (x.compareTo(this.m) >= 0) x.subTo(this.m, x);
	}
	// r = "x^2/R mod m"; x != r
	function montSqrTo(x, r)
	{
		x.squareTo(r);
		this.reduce(r);
	}
	// r = "xy/R mod m"; x,y != r
	function montMulTo(x, y, r)
	{
		x.multiplyTo(y, r);
		this.reduce(r);
	}
	Montgomery.prototype.convert = montConvert;
	Montgomery.prototype.revert = montRevert;
	Montgomery.prototype.reduce = montReduce;
	Montgomery.prototype.mulTo = montMulTo;
	Montgomery.prototype.sqrTo = montSqrTo;
	// (protected) true iff this is even
	function bnpIsEven()
	{
		return ((this.t > 0) ? (this[0] & 1) : this.s) == 0;
	}
	// (protected) this^e, e < 2^32, doing sqr and mul with "r" (HAC 14.79)
	function bnpExp(e, z)
	{
		if (e > 0xffffffff || e < 1) return BigInteger.ONE;
		var r = nbi(),
			r2 = nbi(),
			g = z.convert(this),
			i = nbits(e) - 1;
		g.copyTo(r);
		while (--i >= 0)
		{
			z.sqrTo(r, r2);
			if ((e & (1 << i)) > 0) z.mulTo(r2, g, r);
			else
			{
				var t = r;
				r = r2;
				r2 = t;
			}
		}
		return z.revert(r);
	}
	// (public) this^e % m, 0 <= e < 2^32
	function bnModPowInt(e, m)
	{
		var z;
		if (e < 256 || m.isEven()) z = new Classic(m);
		else z = new Montgomery(m);
		return this.exp(e, z);
	}
	// protected
	BigInteger.prototype.copyTo = bnpCopyTo;
	BigInteger.prototype.fromInt = bnpFromInt;
	BigInteger.prototype.fromString = bnpFromString;
	BigInteger.prototype.clamp = bnpClamp;
	BigInteger.prototype.dlShiftTo = bnpDLShiftTo;
	BigInteger.prototype.drShiftTo = bnpDRShiftTo;
	BigInteger.prototype.lShiftTo = bnpLShiftTo;
	BigInteger.prototype.rShiftTo = bnpRShiftTo;
	BigInteger.prototype.subTo = bnpSubTo;
	BigInteger.prototype.multiplyTo = bnpMultiplyTo;
	BigInteger.prototype.squareTo = bnpSquareTo;
	BigInteger.prototype.divRemTo = bnpDivRemTo;
	BigInteger.prototype.invDigit = bnpInvDigit;
	BigInteger.prototype.isEven = bnpIsEven;
	BigInteger.prototype.exp = bnpExp;
	// public
	BigInteger.prototype.toString = bnToString;
	BigInteger.prototype.negate = bnNegate;
	BigInteger.prototype.abs = bnAbs;
	BigInteger.prototype.compareTo = bnCompareTo;
	BigInteger.prototype.bitLength = bnBitLength;
	BigInteger.prototype.mod = bnMod;
	BigInteger.prototype.modPowInt = bnModPowInt;
	// "constants"
	BigInteger.ZERO = nbv(0);
	BigInteger.ONE = nbv(1);
	// Copyright (c) 2005-2009  Tom Wu
	// All Rights Reserved.
	// See "LICENSE" for details.
	// Extended JavaScript BN functions, required for RSA private ops.
	// Version 1.1: new BigInteger("0", 10) returns "proper" zero
	// Version 1.2: square() API, isProbablePrime fix
	// (public)
	function bnClone()
	{
		var r = nbi();
		this.copyTo(r);
		return r;
	}
	// (public) return value as integer
	function bnIntValue()
	{
		if (this.s < 0)
		{
			if (this.t == 1) return this[0] - this.DV;
			else if (this.t == 0) return -1;
		}
		else if (this.t == 1) return this[0];
		else if (this.t == 0) return 0;
		// assumes 16 < DB < 32
		return ((this[1] & ((1 << (32 - this.DB)) - 1)) << this.DB) | this[0];
	}
	// (public) return value as byte
	function bnByteValue()
	{
		return (this.t == 0) ? this.s : (this[0] << 24) >> 24;
	}
	// (public) return value as short (assumes DB>=16)
	function bnShortValue()
	{
		return (this.t == 0) ? this.s : (this[0] << 16) >> 16;
	}
	// (protected) return x s.t. r^x < DV
	function bnpChunkSize(r)
	{
		return Math.floor(Math.LN2 * this.DB / Math.log(r));
	}
	// (public) 0 if this == 0, 1 if this > 0
	function bnSigNum()
	{
		if (this.s < 0) return -1;
		else if (this.t <= 0 || (this.t == 1 && this[0] <= 0)) return 0;
		else return 1;
	}
	// (protected) convert to radix string
	function bnpToRadix(b)
	{
		if (b == null) b = 10;
		if (this.signum() == 0 || b < 2 || b > 36) return "0";
		var cs = this.chunkSize(b);
		var a = Math.pow(b, cs);
		var d = nbv(a),
			y = nbi(),
			z = nbi(),
			r = "";
		this.divRemTo(d, y, z);
		while (y.signum() > 0)
		{
			r = (a + z.intValue()).toString(b).substr(1) + r;
			y.divRemTo(d, y, z);
		}
		return z.intValue().toString(b) + r;
	}
	// (protected) convert from radix string
	function bnpFromRadix(s, b)
	{
		this.fromInt(0);
		if (b == null) b = 10;
		var cs = this.chunkSize(b);
		var d = Math.pow(b, cs),
			mi = false,
			j = 0,
			w = 0;
		for (var i = 0; i < s.length; ++i)
		{
			var x = intAt(s, i);
			if (x < 0)
			{
				if (s.charAt(i) == "-" && this.signum() == 0) mi = true;
				continue;
			}
			w = b * w + x;
			if (++j >= cs)
			{
				this.dMultiply(d);
				this.dAddOffset(w, 0);
				j = 0;
				w = 0;
			}
		}
		if (j > 0)
		{
			this.dMultiply(Math.pow(b, j));
			this.dAddOffset(w, 0);
		}
		if (mi) BigInteger.ZERO.subTo(this, this);
	}
	// (protected) alternate constructor
	function bnpFromNumber(a, b, c)
	{
		if ("number" == typeof b)
		{
			// new BigInteger(int,int,RNG)
			if (a < 2) this.fromInt(1);
			else
			{
				this.fromNumber(a, c);
				if (!this.testBit(a - 1)) // force MSB set
					this.bitwiseTo(BigInteger.ONE.shiftLeft(a - 1), op_or, this);
				if (this.isEven()) this.dAddOffset(1, 0); // force odd
				while (!this.isProbablePrime(b))
				{
					this.dAddOffset(2, 0);
					if (this.bitLength() > a) this.subTo(BigInteger.ONE.shiftLeft(a - 1), this);
				}
			}
		}
		else
		{
			// new BigInteger(int,RNG)
			var x = new Array(),
				t = a & 7;
			x.length = (a >> 3) + 1;
			b.nextBytes(x);
			if (t > 0) x[0] &= ((1 << t) - 1);
			else x[0] = 0;
			this.fromString(x, 256);
		}
	}
	// (public) convert to bigendian byte array
	function bnToByteArray()
	{
		var i = this.t,
			r = new Array();
		r[0] = this.s;
		var p = this.DB - (i * this.DB) % 8,
			d, k = 0;
		if (i-- > 0)
		{
			if (p < this.DB && (d = this[i] >> p) != (this.s & this.DM) >> p)
				r[k++] = d | (this.s << (this.DB - p));
			while (i >= 0)
			{
				if (p < 8)
				{
					d = (this[i] & ((1 << p) - 1)) << (8 - p);
					d |= this[--i] >> (p += this.DB - 8);
				}
				else
				{
					d = (this[i] >> (p -= 8)) & 0xff;
					if (p <= 0)
					{
						p += this.DB;
						--i;
					}
				}
				if ((d & 0x80) != 0) d |= -256;
				if (k == 0 && (this.s & 0x80) != (d & 0x80)) ++k;
				if (k > 0 || d != this.s) r[k++] = d;
			}
		}
		return r;
	}

	function bnEquals(a)
	{
		return (this.compareTo(a) == 0);
	}

	function bnMin(a)
	{
		return (this.compareTo(a) < 0) ? this : a;
	}

	function bnMax(a)
	{
		return (this.compareTo(a) > 0) ? this : a;
	}
	// (protected) r = this op a (bitwise)
	function bnpBitwiseTo(a, op, r)
	{
		var i, f, m = Math.min(a.t, this.t);
		for (i = 0; i < m; ++i) r[i] = op(this[i], a[i]);
		if (a.t < this.t)
		{
			f = a.s & this.DM;
			for (i = m; i < this.t; ++i) r[i] = op(this[i], f);
			r.t = this.t;
		}
		else
		{
			f = this.s & this.DM;
			for (i = m; i < a.t; ++i) r[i] = op(f, a[i]);
			r.t = a.t;
		}
		r.s = op(this.s, a.s);
		r.clamp();
	}
	// (public) this & a
	function op_and(x, y)
	{
		return x & y;
	}

	function bnAnd(a)
	{
		var r = nbi();
		this.bitwiseTo(a, op_and, r);
		return r;
	}
	// (public) this | a
	function op_or(x, y)
	{
		return x | y;
	}

	function bnOr(a)
	{
		var r = nbi();
		this.bitwiseTo(a, op_or, r);
		return r;
	}
	// (public) this ^ a
	function op_xor(x, y)
	{
		return x ^ y;
	}

	function bnXor(a)
	{
		var r = nbi();
		this.bitwiseTo(a, op_xor, r);
		return r;
	}
	// (public) this & ~a
	function op_andnot(x, y)
	{
		return x & ~y;
	}

	function bnAndNot(a)
	{
		var r = nbi();
		this.bitwiseTo(a, op_andnot, r);
		return r;
	}
	// (public) ~this
	function bnNot()
	{
		var r = nbi();
		for (var i = 0; i < this.t; ++i) r[i] = this.DM & ~this[i];
		r.t = this.t;
		r.s = ~this.s;
		return r;
	}
	// (public) this << n
	function bnShiftLeft(n)
	{
		var r = nbi();
		if (n < 0) this.rShiftTo(-n, r);
		else this.lShiftTo(n, r);
		return r;
	}
	// (public) this >> n
	function bnShiftRight(n)
	{
		var r = nbi();
		if (n < 0) this.lShiftTo(-n, r);
		else this.rShiftTo(n, r);
		return r;
	}
	// return index of lowest 1-bit in x, x < 2^31
	function lbit(x)
	{
		if (x == 0) return -1;
		var r = 0;
		if ((x & 0xffff) == 0)
		{
			x >>= 16;
			r += 16;
		}
		if ((x & 0xff) == 0)
		{
			x >>= 8;
			r += 8;
		}
		if ((x & 0xf) == 0)
		{
			x >>= 4;
			r += 4;
		}
		if ((x & 3) == 0)
		{
			x >>= 2;
			r += 2;
		}
		if ((x & 1) == 0) ++r;
		return r;
	}
	// (public) returns index of lowest 1-bit (or -1 if none)
	function bnGetLowestSetBit()
	{
		for (var i = 0; i < this.t; ++i)
			if (this[i] != 0) return i * this.DB + lbit(this[i]);
		if (this.s < 0) return this.t * this.DB;
		return -1;
	}
	// return number of 1 bits in x
	function cbit(x)
	{
		var r = 0;
		while (x != 0)
		{
			x &= x - 1;
			++r;
		}
		return r;
	}
	// (public) return number of set bits
	function bnBitCount()
	{
		var r = 0,
			x = this.s & this.DM;
		for (var i = 0; i < this.t; ++i) r += cbit(this[i] ^ x);
		return r;
	}
	// (public) true iff nth bit is set
	function bnTestBit(n)
	{
		var j = Math.floor(n / this.DB);
		if (j >= this.t) return (this.s != 0);
		return ((this[j] & (1 << (n % this.DB))) != 0);
	}
	// (protected) this op (1<<n)
	function bnpChangeBit(n, op)
	{
		var r = BigInteger.ONE.shiftLeft(n);
		this.bitwiseTo(r, op, r);
		return r;
	}
	// (public) this | (1<<n)
	function bnSetBit(n)
	{
		return this.changeBit(n, op_or);
	}
	// (public) this & ~(1<<n)
	function bnClearBit(n)
	{
		return this.changeBit(n, op_andnot);
	}
	// (public) this ^ (1<<n)
	function bnFlipBit(n)
	{
		return this.changeBit(n, op_xor);
	}
	// (protected) r = this + a
	function bnpAddTo(a, r)
	{
		var i = 0,
			c = 0,
			m = Math.min(a.t, this.t);
		while (i < m)
		{
			c += this[i] + a[i];
			r[i++] = c & this.DM;
			c >>= this.DB;
		}
		if (a.t < this.t)
		{
			c += a.s;
			while (i < this.t)
			{
				c += this[i];
				r[i++] = c & this.DM;
				c >>= this.DB;
			}
			c += this.s;
		}
		else
		{
			c += this.s;
			while (i < a.t)
			{
				c += a[i];
				r[i++] = c & this.DM;
				c >>= this.DB;
			}
			c += a.s;
		}
		r.s = (c < 0) ? -1 : 0;
		if (c > 0) r[i++] = c;
		else if (c < -1) r[i++] = this.DV + c;
		r.t = i;
		r.clamp();
	}
	// (public) this + a
	function bnAdd(a)
	{
		var r = nbi();
		this.addTo(a, r);
		return r;
	}
	// (public) this - a
	function bnSubtract(a)
	{
		var r = nbi();
		this.subTo(a, r);
		return r;
	}
	// (public) this * a
	function bnMultiply(a)
	{
		var r = nbi();
		this.multiplyTo(a, r);
		return r;
	}
	// (public) this^2
	function bnSquare()
	{
		var r = nbi();
		this.squareTo(r);
		return r;
	}
	// (public) this / a
	function bnDivide(a)
	{
		var r = nbi();
		this.divRemTo(a, r, null);
		return r;
	}
	// (public) this % a
	function bnRemainder(a)
	{
		var r = nbi();
		this.divRemTo(a, null, r);
		return r;
	}
	// (public) [this/a,this%a]
	function bnDivideAndRemainder(a)
	{
		var q = nbi(),
			r = nbi();
		this.divRemTo(a, q, r);
		return new Array(q, r);
	}
	// (protected) this *= n, this >= 0, 1 < n < DV
	function bnpDMultiply(n)
	{
		this[this.t] = this.am(0, n - 1, this, 0, 0, this.t);
		++this.t;
		this.clamp();
	}
	// (protected) this += n << w words, this >= 0
	function bnpDAddOffset(n, w)
	{
		if (n == 0) return;
		while (this.t <= w) this[this.t++] = 0;
		this[w] += n;
		while (this[w] >= this.DV)
		{
			this[w] -= this.DV;
			if (++w >= this.t) this[this.t++] = 0;
			++this[w];
		}
	}
	// A "null" reducer
	/**
	* @constructor
	*/
	function NullExp()
	{}

	function nNop(x)
	{
		return x;
	}

	function nMulTo(x, y, r)
	{
		x.multiplyTo(y, r);
	}

	function nSqrTo(x, r)
	{
		x.squareTo(r);
	}
	NullExp.prototype.convert = nNop;
	NullExp.prototype.revert = nNop;
	NullExp.prototype.mulTo = nMulTo;
	NullExp.prototype.sqrTo = nSqrTo;
	// (public) this^e
	function bnPow(e)
	{
		return this.exp(e, new NullExp());
	}
	// (protected) r = lower n words of "this * a", a.t <= n
	// "this" should be the larger one if appropriate.
	function bnpMultiplyLowerTo(a, n, r)
	{
		var i = Math.min(this.t + a.t, n);
		r.s = 0; // assumes a,this >= 0
		r.t = i;
		while (i > 0) r[--i] = 0;
		var j;
		for (j = r.t - this.t; i < j; ++i) r[i + this.t] = this.am(0, a[i], r, i, 0, this.t);
		for (j = Math.min(a.t, n); i < j; ++i) this.am(0, a[i], r, i, 0, n - i);
		r.clamp();
	}
	// (protected) r = "this * a" without lower n words, n > 0
	// "this" should be the larger one if appropriate.
	function bnpMultiplyUpperTo(a, n, r)
	{
		--n;
		var i = r.t = this.t + a.t - n;
		r.s = 0; // assumes a,this >= 0
		while (--i >= 0) r[i] = 0;
		for (i = Math.max(n - this.t, 0); i < a.t; ++i)
			r[this.t + i - n] = this.am(n - i, a[i], r, 0, 0, this.t + i - n);
		r.clamp();
		r.drShiftTo(1, r);
	}
	// Barrett modular reduction
	/**
	* @constructor
	*/
	function Barrett(m)
	{
		// setup Barrett
		this.r2 = nbi();
		this.q3 = nbi();
		BigInteger.ONE.dlShiftTo(2 * m.t, this.r2);
		this.mu = this.r2.divide(m);
		this.m = m;
	}

	function barrettConvert(x)
	{
		if (x.s < 0 || x.t > 2 * this.m.t) return x.mod(this.m);
		else if (x.compareTo(this.m) < 0) return x;
		else
		{
			var r = nbi();
			x.copyTo(r);
			this.reduce(r);
			return r;
		}
	}

	function barrettRevert(x)
	{
		return x;
	}
	// x = x mod m (HAC 14.42)
	function barrettReduce(x)
	{
		x.drShiftTo(this.m.t - 1, this.r2);
		if (x.t > this.m.t + 1)
		{
			x.t = this.m.t + 1;
			x.clamp();
		}
		this.mu.multiplyUpperTo(this.r2, this.m.t + 1, this.q3);
		this.m.multiplyLowerTo(this.q3, this.m.t + 1, this.r2);
		while (x.compareTo(this.r2) < 0) x.dAddOffset(1, this.m.t + 1);
		x.subTo(this.r2, x);
		while (x.compareTo(this.m) >= 0) x.subTo(this.m, x);
	}
	// r = x^2 mod m; x != r
	function barrettSqrTo(x, r)
	{
		x.squareTo(r);
		this.reduce(r);
	}
	// r = x*y mod m; x,y != r
	function barrettMulTo(x, y, r)
	{
		x.multiplyTo(y, r);
		this.reduce(r);
	}
	Barrett.prototype.convert = barrettConvert;
	Barrett.prototype.revert = barrettRevert;
	Barrett.prototype.reduce = barrettReduce;
	Barrett.prototype.mulTo = barrettMulTo;
	Barrett.prototype.sqrTo = barrettSqrTo;
	// (public) this^e % m (HAC 14.85)
	function bnModPow(e, m)
	{
		var i = e.bitLength(),
			k, r = nbv(1),
			z;
		if (i <= 0) return r;
		else if (i < 18) k = 1;
		else if (i < 48) k = 3;
		else if (i < 144) k = 4;
		else if (i < 768) k = 5;
		else k = 6;
		if (i < 8)
			z = new Classic(m);
		else if (m.isEven())
			z = new Barrett(m);
		else
			z = new Montgomery(m);
		// precomputation
		var g = new Array(),
			n = 3,
			k1 = k - 1,
			km = (1 << k) - 1;
		g[1] = z.convert(this);
		if (k > 1)
		{
			var g2 = nbi();
			z.sqrTo(g[1], g2);
			while (n <= km)
			{
				g[n] = nbi();
				z.mulTo(g2, g[n - 2], g[n]);
				n += 2;
			}
		}
		var j = e.t - 1,
			w, is1 = true,
			r2 = nbi(),
			t;
		i = nbits(e[j]) - 1;
		while (j >= 0)
		{
			if (i >= k1) w = (e[j] >> (i - k1)) & km;
			else
			{
				w = (e[j] & ((1 << (i + 1)) - 1)) << (k1 - i);
				if (j > 0) w |= e[j - 1] >> (this.DB + i - k1);
			}
			n = k;
			while ((w & 1) == 0)
			{
				w >>= 1;
				--n;
			}
			if ((i -= n) < 0)
			{
				i += this.DB;
				--j;
			}
			if (is1)
			{ // ret == 1, don't bother squaring or multiplying it
				g[w].copyTo(r);
				is1 = false;
			}
			else
			{
				while (n > 1)
				{
					z.sqrTo(r, r2);
					z.sqrTo(r2, r);
					n -= 2;
				}
				if (n > 0) z.sqrTo(r, r2);
				else
				{
					t = r;
					r = r2;
					r2 = t;
				}
				z.mulTo(r2, g[w], r);
			}
			while (j >= 0 && (e[j] & (1 << i)) == 0)
			{
				z.sqrTo(r, r2);
				t = r;
				r = r2;
				r2 = t;
				if (--i < 0)
				{
					i = this.DB - 1;
					--j;
				}
			}
		}
		return z.revert(r);
	}
	// (public) gcd(this,a) (HAC 14.54)
	function bnGCD(a)
	{
		var x = (this.s < 0) ? this.negate() : this.clone();
		var y = (a.s < 0) ? a.negate() : a.clone();
		if (x.compareTo(y) < 0)
		{
			var t = x;
			x = y;
			y = t;
		}
		var i = x.getLowestSetBit(),
			g = y.getLowestSetBit();
		if (g < 0) return x;
		if (i < g) g = i;
		if (g > 0)
		{
			x.rShiftTo(g, x);
			y.rShiftTo(g, y);
		}
		while (x.signum() > 0)
		{
			if ((i = x.getLowestSetBit()) > 0) x.rShiftTo(i, x);
			if ((i = y.getLowestSetBit()) > 0) y.rShiftTo(i, y);
			if (x.compareTo(y) >= 0)
			{
				x.subTo(y, x);
				x.rShiftTo(1, x);
			}
			else
			{
				y.subTo(x, y);
				y.rShiftTo(1, y);
			}
		}
		if (g > 0) y.lShiftTo(g, y);
		return y;
	}
	// (protected) this % n, n < 2^26
	function bnpModInt(n)
	{
		if (n <= 0) return 0;
		var d = this.DV % n,
			r = (this.s < 0) ? n - 1 : 0;
		if (this.t > 0)
			if (d == 0) r = this[0] % n;
			else
				for (var i = this.t - 1; i >= 0; --i) r = (d * r + this[i]) % n;
		return r;
	}
	// (public) 1/this % m (HAC 14.61)
	function bnModInverse(m)
	{
		var ac = m.isEven();
		if ((this.isEven() && ac) || m.signum() == 0) return BigInteger.ZERO;
		var u = m.clone(),
			v = this.clone();
		var a = nbv(1),
			b = nbv(0),
			c = nbv(0),
			d = nbv(1);
		while (u.signum() != 0)
		{
			while (u.isEven())
			{
				u.rShiftTo(1, u);
				if (ac)
				{
					if (!a.isEven() || !b.isEven())
					{
						a.addTo(this, a);
						b.subTo(m, b);
					}
					a.rShiftTo(1, a);
				}
				else if (!b.isEven()) b.subTo(m, b);
				b.rShiftTo(1, b);
			}
			while (v.isEven())
			{
				v.rShiftTo(1, v);
				if (ac)
				{
					if (!c.isEven() || !d.isEven())
					{
						c.addTo(this, c);
						d.subTo(m, d);
					}
					c.rShiftTo(1, c);
				}
				else if (!d.isEven()) d.subTo(m, d);
				d.rShiftTo(1, d);
			}
			if (u.compareTo(v) >= 0)
			{
				u.subTo(v, u);
				if (ac) a.subTo(c, a);
				b.subTo(d, b);
			}
			else
			{
				v.subTo(u, v);
				if (ac) c.subTo(a, c);
				d.subTo(b, d);
			}
		}
		if (v.compareTo(BigInteger.ONE) != 0) return BigInteger.ZERO;
		if (d.compareTo(m) >= 0) return d.subtract(m);
		if (d.signum() < 0) d.addTo(m, d);
		else return d;
		if (d.signum() < 0) return d.add(m);
		else return d;
	}
	var lowprimes = [2, 3, 5, 7, 11, 13, 17, 19, 23, 29, 31, 37, 41, 43, 47, 53, 59, 61, 67, 71, 73, 79, 83, 89, 97, 101, 103, 107, 109, 113, 127, 131, 137, 139, 149, 151, 157, 163, 167, 173, 179, 181, 191, 193, 197, 199, 211, 223, 227, 229, 233, 239, 241, 251, 257, 263, 269, 271, 277, 281, 283, 293, 307, 311, 313, 317, 331, 337, 347, 349, 353, 359, 367, 373, 379, 383, 389, 397, 401, 409, 419, 421, 431, 433, 439, 443, 449, 457, 461, 463, 467, 479, 487, 491, 499, 503, 509, 521, 523, 541, 547, 557, 563, 569, 571, 577, 587, 593, 599, 601, 607, 613, 617, 619, 631, 641, 643, 647, 653, 659, 661, 673, 677, 683, 691, 701, 709, 719, 727, 733, 739, 743, 751, 757, 761, 769, 773, 787, 797, 809, 811, 821, 823, 827, 829, 839, 853, 857, 859, 863, 877, 881, 883, 887, 907, 911, 919, 929, 937, 941, 947, 953, 967, 971, 977, 983, 991, 997];
	var lplim = (1 << 26) / lowprimes[lowprimes.length - 1];
	// (public) test primality with certainty >= 1-.5^t
	function bnIsProbablePrime(t)
	{
		var i, x = this.abs();
		if (x.t == 1 && x[0] <= lowprimes[lowprimes.length - 1])
		{
			for (i = 0; i < lowprimes.length; ++i)
				if (x[0] == lowprimes[i]) return true;
			return false;
		}
		if (x.isEven()) return false;
		i = 1;
		while (i < lowprimes.length)
		{
			var m = lowprimes[i],
				j = i + 1;
			while (j < lowprimes.length && m < lplim) m *= lowprimes[j++];
			m = x.modInt(m);
			while (i < j)
				if (m % lowprimes[i++] == 0) return false;
		}
		return x.millerRabin(t);
	}
	// (protected) true if probably prime (HAC 4.24, Miller-Rabin)
	function bnpMillerRabin(t)
	{
		var n1 = this.subtract(BigInteger.ONE);
		var k = n1.getLowestSetBit();
		if (k <= 0) return false;
		var r = n1.shiftRight(k);
		t = (t + 1) >> 1;
		if (t > lowprimes.length) t = lowprimes.length;
		var a = nbi();
		for (var i = 0; i < t; ++i)
		{
			//Pick bases at random, instead of starting at 2
			a.fromInt(lowprimes[Math.floor(Math.random() * lowprimes.length)]);
			var y = a.modPow(r, this);
			if (y.compareTo(BigInteger.ONE) != 0 && y.compareTo(n1) != 0)
			{
				var j = 1;
				while (j++ < k && y.compareTo(n1) != 0)
				{
					y = y.modPowInt(2, this);
					if (y.compareTo(BigInteger.ONE) == 0) return false;
				}
				if (y.compareTo(n1) != 0) return false;
			}
		}
		return true;
	}
	// protected
	BigInteger.prototype.chunkSize = bnpChunkSize;
	BigInteger.prototype.toRadix = bnpToRadix;
	BigInteger.prototype.fromRadix = bnpFromRadix;
	BigInteger.prototype.fromNumber = bnpFromNumber;
	BigInteger.prototype.bitwiseTo = bnpBitwiseTo;
	BigInteger.prototype.changeBit = bnpChangeBit;
	BigInteger.prototype.addTo = bnpAddTo;
	BigInteger.prototype.dMultiply = bnpDMultiply;
	BigInteger.prototype.dAddOffset = bnpDAddOffset;
	BigInteger.prototype.multiplyLowerTo = bnpMultiplyLowerTo;
	BigInteger.prototype.multiplyUpperTo = bnpMultiplyUpperTo;
	BigInteger.prototype.modInt = bnpModInt;
	BigInteger.prototype.millerRabin = bnpMillerRabin;
	// public
	BigInteger.prototype.clone = bnClone;
	BigInteger.prototype.intValue = bnIntValue;
	BigInteger.prototype.byteValue = bnByteValue;
	BigInteger.prototype.shortValue = bnShortValue;
	BigInteger.prototype.signum = bnSigNum;
	BigInteger.prototype.toByteArray = bnToByteArray;
	BigInteger.prototype.equals = bnEquals;
	BigInteger.prototype.min = bnMin;
	BigInteger.prototype.max = bnMax;
	BigInteger.prototype.and = bnAnd;
	BigInteger.prototype.or = bnOr;
	BigInteger.prototype.xor = bnXor;
	BigInteger.prototype.andNot = bnAndNot;
	BigInteger.prototype.not = bnNot;
	BigInteger.prototype.shiftLeft = bnShiftLeft;
	BigInteger.prototype.shiftRight = bnShiftRight;
	BigInteger.prototype.getLowestSetBit = bnGetLowestSetBit;
	BigInteger.prototype.bitCount = bnBitCount;
	BigInteger.prototype.testBit = bnTestBit;
	BigInteger.prototype.setBit = bnSetBit;
	BigInteger.prototype.clearBit = bnClearBit;
	BigInteger.prototype.flipBit = bnFlipBit;
	BigInteger.prototype.add = bnAdd;
	BigInteger.prototype.subtract = bnSubtract;
	BigInteger.prototype.multiply = bnMultiply;
	BigInteger.prototype.divide = bnDivide;
	BigInteger.prototype.remainder = bnRemainder;
	BigInteger.prototype.divideAndRemainder = bnDivideAndRemainder;
	BigInteger.prototype.modPow = bnModPow;
	BigInteger.prototype.modInverse = bnModInverse;
	BigInteger.prototype.pow = bnPow;
	BigInteger.prototype.gcd = bnGCD;
	BigInteger.prototype.isProbablePrime = bnIsProbablePrime;
	// JSBN-specific extension
	BigInteger.prototype.square = bnSquare;
	var Int128 = BigInteger;
	// BigInteger interfaces not implemented in jsbn:
	// BigInteger(int signum, byte[] magnitude)
	// double doubleValue()
	// float floatValue()
	// int hashCode()
	// long longValue()
	// static BigInteger valueOf(long val)
	// Helper functions to make BigInteger functions callable with two parameters
	// as in original C# Clipper
	Int128.prototype.IsNegative = function ()
	{
		if (this.compareTo(Int128.ZERO) == -1) return true;
		else return false;
	};

	Int128.op_Equality = function (val1, val2)
	{
		if (val1.compareTo(val2) == 0) return true;
		else return false;
	};

	Int128.op_Inequality = function (val1, val2)
	{
		if (val1.compareTo(val2) != 0) return true;
		else return false;
	};

	Int128.op_GreaterThan = function (val1, val2)
	{
		if (val1.compareTo(val2) > 0) return true;
		else return false;
	};

	Int128.op_LessThan = function (val1, val2)
	{
		if (val1.compareTo(val2) < 0) return true;
		else return false;
	};

	Int128.op_Addition = function (lhs, rhs)
	{
		return new Int128(lhs, undefined, undefined).add(new Int128(rhs, undefined, undefined));
	};

	Int128.op_Subtraction = function (lhs, rhs)
	{
		return new Int128(lhs, undefined, undefined).subtract(new Int128(rhs, undefined, undefined));
	};

	Int128.Int128Mul = function (lhs, rhs)
	{
		return new Int128(lhs, undefined, undefined).multiply(new Int128(rhs, undefined, undefined));
	};

	Int128.op_Division = function (lhs, rhs)
	{
		return lhs.divide(rhs);
	};

	Int128.prototype.ToDouble = function ()
	{
		return parseFloat(this.toString()); // This could be something faster
	};

	// end of Int128 section
	/*
	// Uncomment the following two lines if you want to use Int128 outside ClipperLib
	if (typeof(document) !== "undefined") window.Int128 = Int128;
	else self.Int128 = Int128;
	*/

	// ---------------------------------------------

	// Here starts the actual Clipper library:
	// Helper function to support Inheritance in Javascript
	var Inherit = function (ce, ce2)
	{
		var p;
		if (typeof (Object.getOwnPropertyNames) === 'undefined')
		{
			for (p in ce2.prototype)
				if (typeof (ce.prototype[p]) === 'undefined' || ce.prototype[p] === Object.prototype[p]) ce.prototype[p] = ce2.prototype[p];
			for (p in ce2)
				if (typeof (ce[p]) === 'undefined') ce[p] = ce2[p];
			ce.$baseCtor = ce2;
		}
		else
		{
			var props = Object.getOwnPropertyNames(ce2.prototype);
			for (var i = 0; i < props.length; i++)
				if (typeof (Object.getOwnPropertyDescriptor(ce.prototype, props[i])) === 'undefined') Object.defineProperty(ce.prototype, props[i], Object.getOwnPropertyDescriptor(ce2.prototype, props[i]));
			for (p in ce2)
				if (typeof (ce[p]) === 'undefined') ce[p] = ce2[p];
			ce.$baseCtor = ce2;
		}
	};

	/**
	* @constructor
	*/
	ClipperLib.Path = function ()
	{
		return [];
	};

	ClipperLib.Path.prototype.push = Array.prototype.push;

	/**
	* @constructor
	*/
	ClipperLib.Paths = function ()
	{
		return []; // Was previously [[]], but caused problems when pushed
	};

	ClipperLib.Paths.prototype.push = Array.prototype.push;

	// Preserves the calling way of original C# Clipper
	// Is essential due to compatibility, because DoublePoint is public class in original C# version
	/**
	* @constructor
	*/
	ClipperLib.DoublePoint = function ()
	{
		var a = arguments;
		this.X = 0;
		this.Y = 0;
		// public DoublePoint(DoublePoint dp)
		// public DoublePoint(IntPoint ip)
		if (a.length === 1)
		{
			this.X = a[0].X;
			this.Y = a[0].Y;
		}
		else if (a.length === 2)
		{
			this.X = a[0];
			this.Y = a[1];
		}
	}; // This is internal faster function when called without arguments
	/**
	* @constructor
	*/
	ClipperLib.DoublePoint0 = function ()
	{
		this.X = 0;
		this.Y = 0;
	};

	ClipperLib.DoublePoint0.prototype = ClipperLib.DoublePoint.prototype;

	// This is internal faster function when called with 1 argument (dp or ip)
	/**
	* @constructor
	*/
	ClipperLib.DoublePoint1 = function (dp)
	{
		this.X = dp.X;
		this.Y = dp.Y;
	};

	ClipperLib.DoublePoint1.prototype = ClipperLib.DoublePoint.prototype;

	// This is internal faster function when called with 2 arguments (x and y)
	/**
	* @constructor
	*/
	ClipperLib.DoublePoint2 = function (x, y)
	{
		this.X = x;
		this.Y = y;
	};

	ClipperLib.DoublePoint2.prototype = ClipperLib.DoublePoint.prototype;

	// PolyTree & PolyNode start
	/**
	* @suppress {missingProperties}
	*/
	ClipperLib.PolyNode = function ()
	{
		this.m_Parent = null;
		this.m_polygon = new ClipperLib.Path();
		this.m_Index = 0;
		this.m_jointype = 0;
		this.m_endtype = 0;
		this.m_Childs = [];
		this.IsOpen = false;
	};

	ClipperLib.PolyNode.prototype.IsHoleNode = function ()
	{
		var result = true;
		var node = this.m_Parent;
		while (node !== null)
		{
			result = !result;
			node = node.m_Parent;
		}
		return result;
	};

	ClipperLib.PolyNode.prototype.ChildCount = function ()
	{
		return this.m_Childs.length;
	};

	ClipperLib.PolyNode.prototype.Contour = function ()
	{
		return this.m_polygon;
	};

	ClipperLib.PolyNode.prototype.AddChild = function (Child)
	{
		var cnt = this.m_Childs.length;
		this.m_Childs.push(Child);
		Child.m_Parent = this;
		Child.m_Index = cnt;
	};

	ClipperLib.PolyNode.prototype.GetNext = function ()
	{
		if (this.m_Childs.length > 0)
			return this.m_Childs[0];
		else
			return this.GetNextSiblingUp();
	};

	ClipperLib.PolyNode.prototype.GetNextSiblingUp = function ()
	{
		if (this.m_Parent === null)
			return null;
		else if (this.m_Index === this.m_Parent.m_Childs.length - 1)
			return this.m_Parent.GetNextSiblingUp();
		else
			return this.m_Parent.m_Childs[this.m_Index + 1];
	};

	ClipperLib.PolyNode.prototype.Childs = function ()
	{
		return this.m_Childs;
	};

	ClipperLib.PolyNode.prototype.Parent = function ()
	{
		return this.m_Parent;
	};

	ClipperLib.PolyNode.prototype.IsHole = function ()
	{
		return this.IsHoleNode();
	};

	// PolyTree : PolyNode
	/**
	 * @suppress {missingProperties}
	 * @constructor
	 */
	ClipperLib.PolyTree = function ()
	{
		this.m_AllPolys = [];
		ClipperLib.PolyNode.call(this);
	};

	ClipperLib.PolyTree.prototype.Clear = function ()
	{
		for (var i = 0, ilen = this.m_AllPolys.length; i < ilen; i++)
			this.m_AllPolys[i] = null;
		this.m_AllPolys.length = 0;
		this.m_Childs.length = 0;
	};

	ClipperLib.PolyTree.prototype.GetFirst = function ()
	{
		if (this.m_Childs.length > 0)
			return this.m_Childs[0];
		else
			return null;
	};

	ClipperLib.PolyTree.prototype.Total = function ()
	{
		var result = this.m_AllPolys.length;
		//with negative offsets, ignore the hidden outer polygon ...
		if (result > 0 && this.m_Childs[0] !== this.m_AllPolys[0]) result--;
		return result;
	};

	Inherit(ClipperLib.PolyTree, ClipperLib.PolyNode);

	// PolyTree & PolyNode end

	ClipperLib.Math_Abs_Int64 = ClipperLib.Math_Abs_Int32 = ClipperLib.Math_Abs_Double = function (a)
	{
		return Math.abs(a);
	};

	ClipperLib.Math_Max_Int32_Int32 = function (a, b)
	{
		return Math.max(a, b);
	};

	/*
	-----------------------------------
	cast_32 speedtest: http://jsperf.com/truncate-float-to-integer/2
	-----------------------------------
	*/
	if (browser.msie || browser.opera || browser.safari) ClipperLib.Cast_Int32 = function (a)
	{
		return a | 0;
	};

	else ClipperLib.Cast_Int32 = function (a)
	{ // eg. browser.chrome || browser.chromium || browser.firefox
		return ~~a;
	};

	/*
	--------------------------
	cast_64 speedtests: http://jsperf.com/truncate-float-to-integer
	Chrome: bitwise_not_floor
	Firefox17: toInteger (typeof test)
	IE9: bitwise_or_floor
	IE7 and IE8: to_parseint
	Chromium: to_floor_or_ceil
	Firefox3: to_floor_or_ceil
	Firefox15: to_floor_or_ceil
	Opera: to_floor_or_ceil
	Safari: to_floor_or_ceil
	--------------------------
	*/
	if (typeof Number.toInteger === "undefined")
		Number.toInteger = null;

	if (browser.chrome) ClipperLib.Cast_Int64 = function (a)
	{
		if (a < -2147483648 || a > 2147483647)
			return a < 0 ? Math.ceil(a) : Math.floor(a);
		else return ~~a;
	};

	else if (browser.firefox && typeof (Number.toInteger) === "function") ClipperLib.Cast_Int64 = function (a)
	{
		return Number.toInteger(a);
	};

	else if (browser.msie7 || browser.msie8) ClipperLib.Cast_Int64 = function (a)
	{
		return parseInt(a, 10);
	};

	else if (browser.msie) ClipperLib.Cast_Int64 = function (a)
	{
		if (a < -2147483648 || a > 2147483647)
			return a < 0 ? Math.ceil(a) : Math.floor(a);
		return a | 0;
	};

	// eg. browser.chromium || browser.firefox || browser.opera || browser.safari
	else ClipperLib.Cast_Int64 = function (a)
	{
		return a < 0 ? Math.ceil(a) : Math.floor(a);
	};

	ClipperLib.Clear = function (a)
	{
		a.length = 0;
	};

	//ClipperLib.MaxSteps = 64; // How many steps at maximum in arc in BuildArc() function
	ClipperLib.PI = 3.141592653589793;
	ClipperLib.PI2 = 2 * 3.141592653589793;
	/**
	* @constructor
	*/
	ClipperLib.IntPoint = function ()
	{
		var a = arguments,
			alen = a.length;
		this.X = 0;
		this.Y = 0;
		if (ClipperLib.use_xyz)
		{
			this.Z = 0;
			if (alen === 3) // public IntPoint(cInt x, cInt y, cInt z = 0)
			{
				this.X = a[0];
				this.Y = a[1];
				this.Z = a[2];
			}
			else if (alen === 2) // public IntPoint(cInt x, cInt y)
			{
				this.X = a[0];
				this.Y = a[1];
				this.Z = 0;
			}
			else if (alen === 1)
			{
				if (a[0] instanceof ClipperLib.DoublePoint) // public IntPoint(DoublePoint dp)
				{
					var dp = a[0];
					this.X = ClipperLib.Clipper.Round(dp.X);
					this.Y = ClipperLib.Clipper.Round(dp.Y);
					this.Z = 0;
				}
				else // public IntPoint(IntPoint pt)
				{
					var pt = a[0];
					if (typeof (pt.Z) === "undefined") pt.Z = 0;
					this.X = pt.X;
					this.Y = pt.Y;
					this.Z = pt.Z;
				}
			}
			else // public IntPoint()
			{
				this.X = 0;
				this.Y = 0;
				this.Z = 0;
			}
		}
		else // if (!ClipperLib.use_xyz)
		{
			if (alen === 2) // public IntPoint(cInt X, cInt Y)
			{
				this.X = a[0];
				this.Y = a[1];
			}
			else if (alen === 1)
			{
				if (a[0] instanceof ClipperLib.DoublePoint) // public IntPoint(DoublePoint dp)
				{
					var dp = a[0];
					this.X = ClipperLib.Clipper.Round(dp.X);
					this.Y = ClipperLib.Clipper.Round(dp.Y);
				}
				else // public IntPoint(IntPoint pt)
				{
					var pt = a[0];
					this.X = pt.X;
					this.Y = pt.Y;
				}
			}
			else // public IntPoint(IntPoint pt)
			{
				this.X = 0;
				this.Y = 0;
			}
		}
	};

	ClipperLib.IntPoint.op_Equality = function (a, b)
	{
		//return a == b;
		return a.X === b.X && a.Y === b.Y;
	};

	ClipperLib.IntPoint.op_Inequality = function (a, b)
	{
		//return a !== b;
		return a.X !== b.X || a.Y !== b.Y;
	};

	/*
  ClipperLib.IntPoint.prototype.Equals = function (obj)
  {
	if (obj === null)
		return false;
	if (obj instanceof ClipperLib.IntPoint)
	{
		var a = Cast(obj, ClipperLib.IntPoint);
		return (this.X == a.X) && (this.Y == a.Y);
	}
	else
		return false;
  };

	*/

	/**
	* @constructor
	*/
	ClipperLib.IntPoint0 = function ()
	{
		this.X = 0;
		this.Y = 0;
		if (ClipperLib.use_xyz)
			this.Z = 0;
	};

	ClipperLib.IntPoint0.prototype = ClipperLib.IntPoint.prototype;

	/**
	* @constructor
	*/
	ClipperLib.IntPoint1 = function (pt)
	{
		this.X = pt.X;
		this.Y = pt.Y;
		if (ClipperLib.use_xyz)
		{
			if (typeof pt.Z === "undefined") this.Z = 0;
			else this.Z = pt.Z;
		}
	};

	ClipperLib.IntPoint1.prototype = ClipperLib.IntPoint.prototype;

	/**
	* @constructor
	*/
	ClipperLib.IntPoint1dp = function (dp)
	{
		this.X = ClipperLib.Clipper.Round(dp.X);
		this.Y = ClipperLib.Clipper.Round(dp.Y);
		if (ClipperLib.use_xyz)
			this.Z = 0;
	};

	ClipperLib.IntPoint1dp.prototype = ClipperLib.IntPoint.prototype;

	/**
	* @constructor
	*/
	ClipperLib.IntPoint2 = function (x, y, z)
	{
		this.X = x;
		this.Y = y;
		if (ClipperLib.use_xyz)
		{
			if (typeof z === "undefined") this.Z = 0;
			else this.Z = z;
		}
	};

	ClipperLib.IntPoint2.prototype = ClipperLib.IntPoint.prototype;

	/**
	* @constructor
	*/
	ClipperLib.IntRect = function ()
	{
		var a = arguments,
			alen = a.length;
		if (alen === 4) // function (l, t, r, b)
		{
			this.left = a[0];
			this.top = a[1];
			this.right = a[2];
			this.bottom = a[3];
		}
		else if (alen === 1) // function (ir)
		{
			var ir = a[0];
			this.left = ir.left;
			this.top = ir.top;
			this.right = ir.right;
			this.bottom = ir.bottom;
		}
		else // function ()
		{
			this.left = 0;
			this.top = 0;
			this.right = 0;
			this.bottom = 0;
		}
	};

	/**
	* @constructor
	*/
	ClipperLib.IntRect0 = function ()
	{
		this.left = 0;
		this.top = 0;
		this.right = 0;
		this.bottom = 0;
	};

	ClipperLib.IntRect0.prototype = ClipperLib.IntRect.prototype;

	/**
	* @constructor
	*/
	ClipperLib.IntRect1 = function (ir)
	{
		this.left = ir.left;
		this.top = ir.top;
		this.right = ir.right;
		this.bottom = ir.bottom;
	};

	ClipperLib.IntRect1.prototype = ClipperLib.IntRect.prototype;

	/**
	* @constructor
	*/
	ClipperLib.IntRect4 = function (l, t, r, b)
	{
		this.left = l;
		this.top = t;
		this.right = r;
		this.bottom = b;
	};

	ClipperLib.IntRect4.prototype = ClipperLib.IntRect.prototype;

	ClipperLib.ClipType = {
		ctIntersection: 0,
		ctUnion: 1,
		ctDifference: 2,
		ctXor: 3
	};

	ClipperLib.PolyType = {
		ptSubject: 0,
		ptClip: 1
	};

	ClipperLib.PolyFillType = {
		pftEvenOdd: 0,
		pftNonZero: 1,
		pftPositive: 2,
		pftNegative: 3
	};

	ClipperLib.JoinType = {
		jtSquare: 0,
		jtRound: 1,
		jtMiter: 2
	};

	ClipperLib.EndType = {
		etOpenSquare: 0,
		etOpenRound: 1,
		etOpenButt: 2,
		etClosedLine: 3,
		etClosedPolygon: 4
	};

	ClipperLib.EdgeSide = {
		esLeft: 0,
		esRight: 1
	};

	ClipperLib.Direction = {
		dRightToLeft: 0,
		dLeftToRight: 1
	};

	/**
	* @constructor
	*/
	ClipperLib.TEdge = function ()
	{
		this.Bot = new ClipperLib.IntPoint0();
		this.Curr = new ClipperLib.IntPoint0(); //current (updated for every new scanbeam)
		this.Top = new ClipperLib.IntPoint0();
		this.Delta = new ClipperLib.IntPoint0();
		this.Dx = 0;
		this.PolyTyp = ClipperLib.PolyType.ptSubject;
		this.Side = ClipperLib.EdgeSide.esLeft; //side only refers to current side of solution poly
		this.WindDelta = 0; //1 or -1 depending on winding direction
		this.WindCnt = 0;
		this.WindCnt2 = 0; //winding count of the opposite polytype
		this.OutIdx = 0;
		this.Next = null;
		this.Prev = null;
		this.NextInLML = null;
		this.NextInAEL = null;
		this.PrevInAEL = null;
		this.NextInSEL = null;
		this.PrevInSEL = null;
	};

	/**
	* @constructor
	*/
	ClipperLib.IntersectNode = function ()
	{
		this.Edge1 = null;
		this.Edge2 = null;
		this.Pt = new ClipperLib.IntPoint0();
	};

	ClipperLib.MyIntersectNodeSort = function () {};

	ClipperLib.MyIntersectNodeSort.Compare = function (node1, node2)
	{
		var i = node2.Pt.Y - node1.Pt.Y;
		if (i > 0) return 1;
		else if (i < 0) return -1;
		else return 0;
	};

	/**
	* @constructor
	*/
	ClipperLib.LocalMinima = function ()
	{
		this.Y = 0;
		this.LeftBound = null;
		this.RightBound = null;
		this.Next = null;
	};

	/**
	* @constructor
	*/
	ClipperLib.Scanbeam = function ()
	{
		this.Y = 0;
		this.Next = null;
	};

	/**
	* @constructor
	*/
	ClipperLib.Maxima = function ()
	{
		this.X = 0;
		this.Next = null;
		this.Prev = null;
	};

	//OutRec: contains a path in the clipping solution. Edges in the AEL will
	//carry a pointer to an OutRec when they are part of the clipping solution.
	/**
	* @constructor
	*/
	ClipperLib.OutRec = function ()
	{
		this.Idx = 0;
		this.IsHole = false;
		this.IsOpen = false;
		this.FirstLeft = null; //see comments in clipper.pas
		this.Pts = null;
		this.BottomPt = null;
		this.PolyNode = null;
	};

	/**
	* @constructor
	*/
	ClipperLib.OutPt = function ()
	{
		this.Idx = 0;
		this.Pt = new ClipperLib.IntPoint0();
		this.Next = null;
		this.Prev = null;
	};

	/**
	* @constructor
	*/
	ClipperLib.Join = function ()
	{
		this.OutPt1 = null;
		this.OutPt2 = null;
		this.OffPt = new ClipperLib.IntPoint0();
	};

	ClipperLib.ClipperBase = function ()
	{
		this.m_MinimaList = null;
		this.m_CurrentLM = null;
		this.m_edges = new Array();
		this.m_UseFullRange = false;
		this.m_HasOpenPaths = false;
		this.PreserveCollinear = false;
		this.m_Scanbeam = null;
		this.m_PolyOuts = null;
		this.m_ActiveEdges = null;
	};

	// Ranges are in original C# too high for Javascript (in current state 2013 september):
	// protected const double horizontal = -3.4E+38;
	// internal const cInt loRange = 0x3FFFFFFF; // = 1073741823 = sqrt(2^63 -1)/2
	// internal const cInt hiRange = 0x3FFFFFFFFFFFFFFFL; // = 4611686018427387903 = sqrt(2^127 -1)/2
	// So had to adjust them to more suitable for Javascript.
	// If JS some day supports truly 64-bit integers, then these ranges can be as in C#
	// and biginteger library can be more simpler (as then 128bit can be represented as two 64bit numbers)
	ClipperLib.ClipperBase.horizontal = -9007199254740992; //-2^53
	ClipperLib.ClipperBase.Skip = -2;
	ClipperLib.ClipperBase.Unassigned = -1;
	ClipperLib.ClipperBase.tolerance = 1E-20;
	ClipperLib.ClipperBase.loRange = 47453132; // sqrt(2^53 -1)/2
	ClipperLib.ClipperBase.hiRange = 4503599627370495; // sqrt(2^106 -1)/2

	ClipperLib.ClipperBase.near_zero = function (val)
	{
		return (val > -ClipperLib.ClipperBase.tolerance) && (val < ClipperLib.ClipperBase.tolerance);
	};

	ClipperLib.ClipperBase.IsHorizontal = function (e)
	{
		return e.Delta.Y === 0;
	};

	ClipperLib.ClipperBase.prototype.PointIsVertex = function (pt, pp)
	{
		var pp2 = pp;
		do {
			if (ClipperLib.IntPoint.op_Equality(pp2.Pt, pt))
				return true;
			pp2 = pp2.Next;
		}
		while (pp2 !== pp)
		return false;
	};

	ClipperLib.ClipperBase.prototype.PointOnLineSegment = function (pt, linePt1, linePt2, UseFullRange)
	{
		if (UseFullRange)
			return ((pt.X === linePt1.X) && (pt.Y === linePt1.Y)) ||
				((pt.X === linePt2.X) && (pt.Y === linePt2.Y)) ||
				(((pt.X > linePt1.X) === (pt.X < linePt2.X)) &&
					((pt.Y > linePt1.Y) === (pt.Y < linePt2.Y)) &&
					(Int128.op_Equality(Int128.Int128Mul((pt.X - linePt1.X), (linePt2.Y - linePt1.Y)),
						Int128.Int128Mul((linePt2.X - linePt1.X), (pt.Y - linePt1.Y)))));
		else
			return ((pt.X === linePt1.X) && (pt.Y === linePt1.Y)) || ((pt.X === linePt2.X) && (pt.Y === linePt2.Y)) || (((pt.X > linePt1.X) === (pt.X < linePt2.X)) && ((pt.Y > linePt1.Y) === (pt.Y < linePt2.Y)) && ((pt.X - linePt1.X) * (linePt2.Y - linePt1.Y) === (linePt2.X - linePt1.X) * (pt.Y - linePt1.Y)));
	};

	ClipperLib.ClipperBase.prototype.PointOnPolygon = function (pt, pp, UseFullRange)
	{
		var pp2 = pp;
		while (true)
		{
			if (this.PointOnLineSegment(pt, pp2.Pt, pp2.Next.Pt, UseFullRange))
				return true;
			pp2 = pp2.Next;
			if (pp2 === pp)
				break;
		}
		return false;
	};

	ClipperLib.ClipperBase.prototype.SlopesEqual = ClipperLib.ClipperBase.SlopesEqual = function ()
	{
		var a = arguments,
			alen = a.length;
		var e1, e2, pt1, pt2, pt3, pt4, UseFullRange;
		if (alen === 3) // function (e1, e2, UseFullRange)
		{
			e1 = a[0];
			e2 = a[1];
			UseFullRange = a[2];
			if (UseFullRange)
				return Int128.op_Equality(Int128.Int128Mul(e1.Delta.Y, e2.Delta.X), Int128.Int128Mul(e1.Delta.X, e2.Delta.Y));
			else
				return ClipperLib.Cast_Int64((e1.Delta.Y) * (e2.Delta.X)) === ClipperLib.Cast_Int64((e1.Delta.X) * (e2.Delta.Y));
		}
		else if (alen === 4) // function (pt1, pt2, pt3, UseFullRange)
		{
			pt1 = a[0];
			pt2 = a[1];
			pt3 = a[2];
			UseFullRange = a[3];
			if (UseFullRange)
				return Int128.op_Equality(Int128.Int128Mul(pt1.Y - pt2.Y, pt2.X - pt3.X), Int128.Int128Mul(pt1.X - pt2.X, pt2.Y - pt3.Y));
			else
				return ClipperLib.Cast_Int64((pt1.Y - pt2.Y) * (pt2.X - pt3.X)) - ClipperLib.Cast_Int64((pt1.X - pt2.X) * (pt2.Y - pt3.Y)) === 0;
		}
		else // function (pt1, pt2, pt3, pt4, UseFullRange)
		{
			pt1 = a[0];
			pt2 = a[1];
			pt3 = a[2];
			pt4 = a[3];
			UseFullRange = a[4];
			if (UseFullRange)
				return Int128.op_Equality(Int128.Int128Mul(pt1.Y - pt2.Y, pt3.X - pt4.X), Int128.Int128Mul(pt1.X - pt2.X, pt3.Y - pt4.Y));
			else
				return ClipperLib.Cast_Int64((pt1.Y - pt2.Y) * (pt3.X - pt4.X)) - ClipperLib.Cast_Int64((pt1.X - pt2.X) * (pt3.Y - pt4.Y)) === 0;
		}
	};

	ClipperLib.ClipperBase.SlopesEqual3 = function (e1, e2, UseFullRange)
	{
		if (UseFullRange)
			return Int128.op_Equality(Int128.Int128Mul(e1.Delta.Y, e2.Delta.X), Int128.Int128Mul(e1.Delta.X, e2.Delta.Y));
		else
			return ClipperLib.Cast_Int64((e1.Delta.Y) * (e2.Delta.X)) === ClipperLib.Cast_Int64((e1.Delta.X) * (e2.Delta.Y));
	};

	ClipperLib.ClipperBase.SlopesEqual4 = function (pt1, pt2, pt3, UseFullRange)
	{
		if (UseFullRange)
			return Int128.op_Equality(Int128.Int128Mul(pt1.Y - pt2.Y, pt2.X - pt3.X), Int128.Int128Mul(pt1.X - pt2.X, pt2.Y - pt3.Y));
		else
			return ClipperLib.Cast_Int64((pt1.Y - pt2.Y) * (pt2.X - pt3.X)) - ClipperLib.Cast_Int64((pt1.X - pt2.X) * (pt2.Y - pt3.Y)) === 0;
	};

	ClipperLib.ClipperBase.SlopesEqual5 = function (pt1, pt2, pt3, pt4, UseFullRange)
	{
		if (UseFullRange)
			return Int128.op_Equality(Int128.Int128Mul(pt1.Y - pt2.Y, pt3.X - pt4.X), Int128.Int128Mul(pt1.X - pt2.X, pt3.Y - pt4.Y));
		else
			return ClipperLib.Cast_Int64((pt1.Y - pt2.Y) * (pt3.X - pt4.X)) - ClipperLib.Cast_Int64((pt1.X - pt2.X) * (pt3.Y - pt4.Y)) === 0;
	};

	ClipperLib.ClipperBase.prototype.Clear = function ()
	{
		this.DisposeLocalMinimaList();
		for (var i = 0, ilen = this.m_edges.length; i < ilen; ++i)
		{
			for (var j = 0, jlen = this.m_edges[i].length; j < jlen; ++j)
				this.m_edges[i][j] = null;
			ClipperLib.Clear(this.m_edges[i]);
		}
		ClipperLib.Clear(this.m_edges);
		this.m_UseFullRange = false;
		this.m_HasOpenPaths = false;
	};

	ClipperLib.ClipperBase.prototype.DisposeLocalMinimaList = function ()
	{
		while (this.m_MinimaList !== null)
		{
			var tmpLm = this.m_MinimaList.Next;
			this.m_MinimaList = null;
			this.m_MinimaList = tmpLm;
		}
		this.m_CurrentLM = null;
	};

	ClipperLib.ClipperBase.prototype.RangeTest = function (Pt, useFullRange)
	{
		if (useFullRange.Value)
		{
			if (Pt.X > ClipperLib.ClipperBase.hiRange || Pt.Y > ClipperLib.ClipperBase.hiRange || -Pt.X > ClipperLib.ClipperBase.hiRange || -Pt.Y > ClipperLib.ClipperBase.hiRange)
				ClipperLib.Error("Coordinate outside allowed range in RangeTest().");
		}
		else if (Pt.X > ClipperLib.ClipperBase.loRange || Pt.Y > ClipperLib.ClipperBase.loRange || -Pt.X > ClipperLib.ClipperBase.loRange || -Pt.Y > ClipperLib.ClipperBase.loRange)
		{
			useFullRange.Value = true;
			this.RangeTest(Pt, useFullRange);
		}
	};

	ClipperLib.ClipperBase.prototype.InitEdge = function (e, eNext, ePrev, pt)
	{
		e.Next = eNext;
		e.Prev = ePrev;
		//e.Curr = pt;
		e.Curr.X = pt.X;
		e.Curr.Y = pt.Y;
		if (ClipperLib.use_xyz) e.Curr.Z = pt.Z;
		e.OutIdx = -1;
	};

	ClipperLib.ClipperBase.prototype.InitEdge2 = function (e, polyType)
	{
		if (e.Curr.Y >= e.Next.Curr.Y)
		{
			//e.Bot = e.Curr;
			e.Bot.X = e.Curr.X;
			e.Bot.Y = e.Curr.Y;
			if (ClipperLib.use_xyz) e.Bot.Z = e.Curr.Z;
			//e.Top = e.Next.Curr;
			e.Top.X = e.Next.Curr.X;
			e.Top.Y = e.Next.Curr.Y;
			if (ClipperLib.use_xyz) e.Top.Z = e.Next.Curr.Z;
		}
		else
		{
			//e.Top = e.Curr;
			e.Top.X = e.Curr.X;
			e.Top.Y = e.Curr.Y;
			if (ClipperLib.use_xyz) e.Top.Z = e.Curr.Z;
			//e.Bot = e.Next.Curr;
			e.Bot.X = e.Next.Curr.X;
			e.Bot.Y = e.Next.Curr.Y;
			if (ClipperLib.use_xyz) e.Bot.Z = e.Next.Curr.Z;
		}
		this.SetDx(e);
		e.PolyTyp = polyType;
	};

	ClipperLib.ClipperBase.prototype.FindNextLocMin = function (E)
	{
		var E2;
		for (;;)
		{
			while (ClipperLib.IntPoint.op_Inequality(E.Bot, E.Prev.Bot) || ClipperLib.IntPoint.op_Equality(E.Curr, E.Top))
				E = E.Next;
			if (E.Dx !== ClipperLib.ClipperBase.horizontal && E.Prev.Dx !== ClipperLib.ClipperBase.horizontal)
				break;
			while (E.Prev.Dx === ClipperLib.ClipperBase.horizontal)
				E = E.Prev;
			E2 = E;
			while (E.Dx === ClipperLib.ClipperBase.horizontal)
				E = E.Next;
			if (E.Top.Y === E.Prev.Bot.Y)
				continue;
			//ie just an intermediate horz.
			if (E2.Prev.Bot.X < E.Bot.X)
				E = E2;
			break;
		}
		return E;
	};

	ClipperLib.ClipperBase.prototype.ProcessBound = function (E, LeftBoundIsForward)
	{
		var EStart;
		var Result = E;
		var Horz;

		if (Result.OutIdx === ClipperLib.ClipperBase.Skip)
		{
			//check if there are edges beyond the skip edge in the bound and if so
			//create another LocMin and calling ProcessBound once more ...
			E = Result;
			if (LeftBoundIsForward)
			{
				while (E.Top.Y === E.Next.Bot.Y) E = E.Next;
				while (E !== Result && E.Dx === ClipperLib.ClipperBase.horizontal) E = E.Prev;
			}
			else
			{
				while (E.Top.Y === E.Prev.Bot.Y) E = E.Prev;
				while (E !== Result && E.Dx === ClipperLib.ClipperBase.horizontal) E = E.Next;
			}
			if (E === Result)
			{
				if (LeftBoundIsForward) Result = E.Next;
				else Result = E.Prev;
			}
			else
			{
				//there are more edges in the bound beyond result starting with E
				if (LeftBoundIsForward)
					E = Result.Next;
				else
					E = Result.Prev;
				var locMin = new ClipperLib.LocalMinima();
				locMin.Next = null;
				locMin.Y = E.Bot.Y;
				locMin.LeftBound = null;
				locMin.RightBound = E;
				E.WindDelta = 0;
				Result = this.ProcessBound(E, LeftBoundIsForward);
				this.InsertLocalMinima(locMin);
			}
			return Result;
		}

		if (E.Dx === ClipperLib.ClipperBase.horizontal)
		{
			//We need to be careful with open paths because this may not be a
			//true local minima (ie E may be following a skip edge).
			//Also, consecutive horz. edges may start heading left before going right.
			if (LeftBoundIsForward) EStart = E.Prev;
			else EStart = E.Next;

			if (EStart.Dx === ClipperLib.ClipperBase.horizontal) //ie an adjoining horizontal skip edge
			{
				if (EStart.Bot.X !== E.Bot.X && EStart.Top.X !== E.Bot.X)
					this.ReverseHorizontal(E);
			}
			else if (EStart.Bot.X !== E.Bot.X)
				this.ReverseHorizontal(E);
		}

		EStart = E;
		if (LeftBoundIsForward)
		{
			while (Result.Top.Y === Result.Next.Bot.Y && Result.Next.OutIdx !== ClipperLib.ClipperBase.Skip)
				Result = Result.Next;
			if (Result.Dx === ClipperLib.ClipperBase.horizontal && Result.Next.OutIdx !== ClipperLib.ClipperBase.Skip)
			{
				//nb: at the top of a bound, horizontals are added to the bound
				//only when the preceding edge attaches to the horizontal's left vertex
				//unless a Skip edge is encountered when that becomes the top divide
				Horz = Result;
				while (Horz.Prev.Dx === ClipperLib.ClipperBase.horizontal)
					Horz = Horz.Prev;
				if (Horz.Prev.Top.X > Result.Next.Top.X)
					Result = Horz.Prev;
			}
			while (E !== Result)
			{
				E.NextInLML = E.Next;
				if (E.Dx === ClipperLib.ClipperBase.horizontal && E !== EStart && E.Bot.X !== E.Prev.Top.X)
					this.ReverseHorizontal(E);
				E = E.Next;
			}
			if (E.Dx === ClipperLib.ClipperBase.horizontal && E !== EStart && E.Bot.X !== E.Prev.Top.X)
				this.ReverseHorizontal(E);
			Result = Result.Next;
			//move to the edge just beyond current bound
		}
		else
		{
			while (Result.Top.Y === Result.Prev.Bot.Y && Result.Prev.OutIdx !== ClipperLib.ClipperBase.Skip)
				Result = Result.Prev;
			if (Result.Dx === ClipperLib.ClipperBase.horizontal && Result.Prev.OutIdx !== ClipperLib.ClipperBase.Skip)
			{
				Horz = Result;
				while (Horz.Next.Dx === ClipperLib.ClipperBase.horizontal)
					Horz = Horz.Next;
				if (Horz.Next.Top.X === Result.Prev.Top.X || Horz.Next.Top.X > Result.Prev.Top.X)
				{
					Result = Horz.Next;
				}
			}
			while (E !== Result)
			{
				E.NextInLML = E.Prev;
				if (E.Dx === ClipperLib.ClipperBase.horizontal && E !== EStart && E.Bot.X !== E.Next.Top.X)
					this.ReverseHorizontal(E);
				E = E.Prev;
			}
			if (E.Dx === ClipperLib.ClipperBase.horizontal && E !== EStart && E.Bot.X !== E.Next.Top.X)
				this.ReverseHorizontal(E);
			Result = Result.Prev;
			//move to the edge just beyond current bound
		}

		return Result;
	};

	ClipperLib.ClipperBase.prototype.AddPath = function (pg, polyType, Closed)
	{
		if (ClipperLib.use_lines)
		{
			if (!Closed && polyType === ClipperLib.PolyType.ptClip)
				ClipperLib.Error("AddPath: Open paths must be subject.");
		}
		else
		{
			if (!Closed)
				ClipperLib.Error("AddPath: Open paths have been disabled.");
		}
		var highI = pg.length - 1;
		if (Closed)
			while (highI > 0 && (ClipperLib.IntPoint.op_Equality(pg[highI], pg[0])))
				--highI;
		while (highI > 0 && (ClipperLib.IntPoint.op_Equality(pg[highI], pg[highI - 1])))
			--highI;
		if ((Closed && highI < 2) || (!Closed && highI < 1))
			return false;
		//create a new edge array ...
		var edges = new Array();
		for (var i = 0; i <= highI; i++)
			edges.push(new ClipperLib.TEdge());
		var IsFlat = true;
		//1. Basic (first) edge initialization ...

		//edges[1].Curr = pg[1];
		edges[1].Curr.X = pg[1].X;
		edges[1].Curr.Y = pg[1].Y;
		if (ClipperLib.use_xyz) edges[1].Curr.Z = pg[1].Z;

		var $1 = {
			Value: this.m_UseFullRange
		};

		this.RangeTest(pg[0], $1);
		this.m_UseFullRange = $1.Value;

		$1.Value = this.m_UseFullRange;
		this.RangeTest(pg[highI], $1);
		this.m_UseFullRange = $1.Value;

		this.InitEdge(edges[0], edges[1], edges[highI], pg[0]);
		this.InitEdge(edges[highI], edges[0], edges[highI - 1], pg[highI]);
		for (var i = highI - 1; i >= 1; --i)
		{
			$1.Value = this.m_UseFullRange;
			this.RangeTest(pg[i], $1);
			this.m_UseFullRange = $1.Value;

			this.InitEdge(edges[i], edges[i + 1], edges[i - 1], pg[i]);
		}

		var eStart = edges[0];
		//2. Remove duplicate vertices, and (when closed) collinear edges ...
		var E = eStart,
			eLoopStop = eStart;
		for (;;)
		{
			//console.log(E.Next, eStart);
			//nb: allows matching start and end points when not Closed ...
			if (E.Curr === E.Next.Curr && (Closed || E.Next !== eStart))
			{
				if (E === E.Next)
					break;
				if (E === eStart)
					eStart = E.Next;
				E = this.RemoveEdge(E);
				eLoopStop = E;
				continue;
			}
			if (E.Prev === E.Next)
				break;
			else if (Closed && ClipperLib.ClipperBase.SlopesEqual4(E.Prev.Curr, E.Curr, E.Next.Curr, this.m_UseFullRange) && (!this.PreserveCollinear || !this.Pt2IsBetweenPt1AndPt3(E.Prev.Curr, E.Curr, E.Next.Curr)))
			{
				//Collinear edges are allowed for open paths but in closed paths
				//the default is to merge adjacent collinear edges into a single edge.
				//However, if the PreserveCollinear property is enabled, only overlapping
				//collinear edges (ie spikes) will be removed from closed paths.
				if (E === eStart)
					eStart = E.Next;
				E = this.RemoveEdge(E);
				E = E.Prev;
				eLoopStop = E;
				continue;
			}
			E = E.Next;
			if ((E === eLoopStop) || (!Closed && E.Next === eStart)) break;
		}
		if ((!Closed && (E === E.Next)) || (Closed && (E.Prev === E.Next)))
			return false;
		if (!Closed)
		{
			this.m_HasOpenPaths = true;
			eStart.Prev.OutIdx = ClipperLib.ClipperBase.Skip;
		}
		//3. Do second stage of edge initialization ...
		E = eStart;
		do {
			this.InitEdge2(E, polyType);
			E = E.Next;
			if (IsFlat && E.Curr.Y !== eStart.Curr.Y)
				IsFlat = false;
		}
		while (E !== eStart)
		//4. Finally, add edge bounds to LocalMinima list ...
		//Totally flat paths must be handled differently when adding them
		//to LocalMinima list to avoid endless loops etc ...
		if (IsFlat)
		{
			if (Closed)
				return false;

			E.Prev.OutIdx = ClipperLib.ClipperBase.Skip;

			var locMin = new ClipperLib.LocalMinima();
			locMin.Next = null;
			locMin.Y = E.Bot.Y;
			locMin.LeftBound = null;
			locMin.RightBound = E;
			locMin.RightBound.Side = ClipperLib.EdgeSide.esRight;
			locMin.RightBound.WindDelta = 0;

			for (;;)
			{
				if (E.Bot.X !== E.Prev.Top.X) this.ReverseHorizontal(E);
				if (E.Next.OutIdx === ClipperLib.ClipperBase.Skip) break;
				E.NextInLML = E.Next;
				E = E.Next;
			}
			this.InsertLocalMinima(locMin);
			this.m_edges.push(edges);
			return true;
		}
		this.m_edges.push(edges);
		var leftBoundIsForward;
		var EMin = null;

		//workaround to avoid an endless loop in the while loop below when
		//open paths have matching start and end points ...
		if (ClipperLib.IntPoint.op_Equality(E.Prev.Bot, E.Prev.Top))
			E = E.Next;

		for (;;)
		{
			E = this.FindNextLocMin(E);
			if (E === EMin)
				break;
			else if (EMin === null)
				EMin = E;
			//E and E.Prev now share a local minima (left aligned if horizontal).
			//Compare their slopes to find which starts which bound ...
			var locMin = new ClipperLib.LocalMinima();
			locMin.Next = null;
			locMin.Y = E.Bot.Y;
			if (E.Dx < E.Prev.Dx)
			{
				locMin.LeftBound = E.Prev;
				locMin.RightBound = E;
				leftBoundIsForward = false;
				//Q.nextInLML = Q.prev
			}
			else
			{
				locMin.LeftBound = E;
				locMin.RightBound = E.Prev;
				leftBoundIsForward = true;
				//Q.nextInLML = Q.next
			}
			locMin.LeftBound.Side = ClipperLib.EdgeSide.esLeft;
			locMin.RightBound.Side = ClipperLib.EdgeSide.esRight;
			if (!Closed)
				locMin.LeftBound.WindDelta = 0;
			else if (locMin.LeftBound.Next === locMin.RightBound)
				locMin.LeftBound.WindDelta = -1;
			else
				locMin.LeftBound.WindDelta = 1;
			locMin.RightBound.WindDelta = -locMin.LeftBound.WindDelta;
			E = this.ProcessBound(locMin.LeftBound, leftBoundIsForward);
			if (E.OutIdx === ClipperLib.ClipperBase.Skip)
				E = this.ProcessBound(E, leftBoundIsForward);
			var E2 = this.ProcessBound(locMin.RightBound, !leftBoundIsForward);
			if (E2.OutIdx === ClipperLib.ClipperBase.Skip) E2 = this.ProcessBound(E2, !leftBoundIsForward);
			if (locMin.LeftBound.OutIdx === ClipperLib.ClipperBase.Skip)
				locMin.LeftBound = null;
			else if (locMin.RightBound.OutIdx === ClipperLib.ClipperBase.Skip)
				locMin.RightBound = null;
			this.InsertLocalMinima(locMin);
			if (!leftBoundIsForward)
				E = E2;
		}
		return true;
	};

	ClipperLib.ClipperBase.prototype.AddPaths = function (ppg, polyType, closed)
	{
		//  console.log("-------------------------------------------");
		//  console.log(JSON.stringify(ppg));
		var result = false;
		for (var i = 0, ilen = ppg.length; i < ilen; ++i)
			if (this.AddPath(ppg[i], polyType, closed))
				result = true;
		return result;
	};

	ClipperLib.ClipperBase.prototype.Pt2IsBetweenPt1AndPt3 = function (pt1, pt2, pt3)
	{
		if ((ClipperLib.IntPoint.op_Equality(pt1, pt3)) || (ClipperLib.IntPoint.op_Equality(pt1, pt2)) || (ClipperLib.IntPoint.op_Equality(pt3, pt2)))

			//if ((pt1 == pt3) || (pt1 == pt2) || (pt3 == pt2))
			return false;

		else if (pt1.X !== pt3.X)
			return (pt2.X > pt1.X) === (pt2.X < pt3.X);
		else
			return (pt2.Y > pt1.Y) === (pt2.Y < pt3.Y);
	};

	ClipperLib.ClipperBase.prototype.RemoveEdge = function (e)
	{
		//removes e from double_linked_list (but without removing from memory)
		e.Prev.Next = e.Next;
		e.Next.Prev = e.Prev;
		var result = e.Next;
		e.Prev = null; //flag as removed (see ClipperBase.Clear)
		return result;
	};

	ClipperLib.ClipperBase.prototype.SetDx = function (e)
	{
		e.Delta.X = (e.Top.X - e.Bot.X);
		e.Delta.Y = (e.Top.Y - e.Bot.Y);
		if (e.Delta.Y === 0) e.Dx = ClipperLib.ClipperBase.horizontal;
		else e.Dx = (e.Delta.X) / (e.Delta.Y);
	};

	ClipperLib.ClipperBase.prototype.InsertLocalMinima = function (newLm)
	{
		if (this.m_MinimaList === null)
		{
			this.m_MinimaList = newLm;
		}
		else if (newLm.Y >= this.m_MinimaList.Y)
		{
			newLm.Next = this.m_MinimaList;
			this.m_MinimaList = newLm;
		}
		else
		{
			var tmpLm = this.m_MinimaList;
			while (tmpLm.Next !== null && (newLm.Y < tmpLm.Next.Y))
				tmpLm = tmpLm.Next;
			newLm.Next = tmpLm.Next;
			tmpLm.Next = newLm;
		}
	};

	ClipperLib.ClipperBase.prototype.PopLocalMinima = function (Y, current)
	{
		current.v = this.m_CurrentLM;
		if (this.m_CurrentLM !== null && this.m_CurrentLM.Y === Y)
		{
			this.m_CurrentLM = this.m_CurrentLM.Next;
			return true;
		}
		return false;
	};

	ClipperLib.ClipperBase.prototype.ReverseHorizontal = function (e)
	{
		//swap horizontal edges' top and bottom x's so they follow the natural
		//progression of the bounds - ie so their xbots will align with the
		//adjoining lower edge. [Helpful in the ProcessHorizontal() method.]
		var tmp = e.Top.X;
		e.Top.X = e.Bot.X;
		e.Bot.X = tmp;
		if (ClipperLib.use_xyz)
		{
			tmp = e.Top.Z;
			e.Top.Z = e.Bot.Z;
			e.Bot.Z = tmp;
		}
	};

	ClipperLib.ClipperBase.prototype.Reset = function ()
	{
		this.m_CurrentLM = this.m_MinimaList;
		if (this.m_CurrentLM === null) //ie nothing to process
			return;
		//reset all edges ...
		this.m_Scanbeam = null;
		var lm = this.m_MinimaList;
		while (lm !== null)
		{
			this.InsertScanbeam(lm.Y);
			var e = lm.LeftBound;
			if (e !== null)
			{
				//e.Curr = e.Bot;
				e.Curr.X = e.Bot.X;
				e.Curr.Y = e.Bot.Y;
				if (ClipperLib.use_xyz) e.Curr.Z = e.Bot.Z;
				e.OutIdx = ClipperLib.ClipperBase.Unassigned;
			}
			e = lm.RightBound;
			if (e !== null)
			{
				//e.Curr = e.Bot;
				e.Curr.X = e.Bot.X;
				e.Curr.Y = e.Bot.Y;
				if (ClipperLib.use_xyz) e.Curr.Z = e.Bot.Z;
				e.OutIdx = ClipperLib.ClipperBase.Unassigned;
			}
			lm = lm.Next;
		}
		this.m_ActiveEdges = null;
	};

	ClipperLib.ClipperBase.prototype.InsertScanbeam = function (Y)
	{
		//single-linked list: sorted descending, ignoring dups.
		if (this.m_Scanbeam === null)
		{
			this.m_Scanbeam = new ClipperLib.Scanbeam();
			this.m_Scanbeam.Next = null;
			this.m_Scanbeam.Y = Y;
		}
		else if (Y > this.m_Scanbeam.Y)
		{
			var newSb = new ClipperLib.Scanbeam();
			newSb.Y = Y;
			newSb.Next = this.m_Scanbeam;
			this.m_Scanbeam = newSb;
		}
		else
		{
			var sb2 = this.m_Scanbeam;
			while (sb2.Next !== null && Y <= sb2.Next.Y)
			{
				sb2 = sb2.Next;
			}
			if (Y === sb2.Y)
			{
				return;
			} //ie ignores duplicates
			var newSb1 = new ClipperLib.Scanbeam();
			newSb1.Y = Y;
			newSb1.Next = sb2.Next;
			sb2.Next = newSb1;
		}
	};

	ClipperLib.ClipperBase.prototype.PopScanbeam = function (Y)
	{
		if (this.m_Scanbeam === null)
		{
			Y.v = 0;
			return false;
		}
		Y.v = this.m_Scanbeam.Y;
		this.m_Scanbeam = this.m_Scanbeam.Next;
		return true;
	};

	ClipperLib.ClipperBase.prototype.LocalMinimaPending = function ()
	{
		return (this.m_CurrentLM !== null);
	};

	ClipperLib.ClipperBase.prototype.CreateOutRec = function ()
	{
		var result = new ClipperLib.OutRec();
		result.Idx = ClipperLib.ClipperBase.Unassigned;
		result.IsHole = false;
		result.IsOpen = false;
		result.FirstLeft = null;
		result.Pts = null;
		result.BottomPt = null;
		result.PolyNode = null;
		this.m_PolyOuts.push(result);
		result.Idx = this.m_PolyOuts.length - 1;
		return result;
	};

	ClipperLib.ClipperBase.prototype.DisposeOutRec = function (index)
	{
		var outRec = this.m_PolyOuts[index];
		outRec.Pts = null;
		outRec = null;
		this.m_PolyOuts[index] = null;
	};

	ClipperLib.ClipperBase.prototype.UpdateEdgeIntoAEL = function (e)
	{
		if (e.NextInLML === null)
		{
			ClipperLib.Error("UpdateEdgeIntoAEL: invalid call");
		}
		var AelPrev = e.PrevInAEL;
		var AelNext = e.NextInAEL;
		e.NextInLML.OutIdx = e.OutIdx;
		if (AelPrev !== null)
		{
			AelPrev.NextInAEL = e.NextInLML;
		}
		else
		{
			this.m_ActiveEdges = e.NextInLML;
		}
		if (AelNext !== null)
		{
			AelNext.PrevInAEL = e.NextInLML;
		}
		e.NextInLML.Side = e.Side;
		e.NextInLML.WindDelta = e.WindDelta;
		e.NextInLML.WindCnt = e.WindCnt;
		e.NextInLML.WindCnt2 = e.WindCnt2;
		e = e.NextInLML;
		e.Curr.X = e.Bot.X;
		e.Curr.Y = e.Bot.Y;
		e.PrevInAEL = AelPrev;
		e.NextInAEL = AelNext;
		if (!ClipperLib.ClipperBase.IsHorizontal(e))
		{
			this.InsertScanbeam(e.Top.Y);
		}
		return e;
	};

	ClipperLib.ClipperBase.prototype.SwapPositionsInAEL = function (edge1, edge2)
	{
		//check that one or other edge hasn't already been removed from AEL ...
		if (edge1.NextInAEL === edge1.PrevInAEL || edge2.NextInAEL === edge2.PrevInAEL)
		{
			return;
		}

		if (edge1.NextInAEL === edge2)
		{
			var next = edge2.NextInAEL;
			if (next !== null)
			{
				next.PrevInAEL = edge1;
			}
			var prev = edge1.PrevInAEL;
			if (prev !== null)
			{
				prev.NextInAEL = edge2;
			}
			edge2.PrevInAEL = prev;
			edge2.NextInAEL = edge1;
			edge1.PrevInAEL = edge2;
			edge1.NextInAEL = next;
		}
		else if (edge2.NextInAEL === edge1)
		{
			var next1 = edge1.NextInAEL;
			if (next1 !== null)
			{
				next1.PrevInAEL = edge2;
			}
			var prev1 = edge2.PrevInAEL;
			if (prev1 !== null)
			{
				prev1.NextInAEL = edge1;
			}
			edge1.PrevInAEL = prev1;
			edge1.NextInAEL = edge2;
			edge2.PrevInAEL = edge1;
			edge2.NextInAEL = next1;
		}
		else
		{
			var next2 = edge1.NextInAEL;
			var prev2 = edge1.PrevInAEL;
			edge1.NextInAEL = edge2.NextInAEL;
			if (edge1.NextInAEL !== null)
			{
				edge1.NextInAEL.PrevInAEL = edge1;
			}
			edge1.PrevInAEL = edge2.PrevInAEL;
			if (edge1.PrevInAEL !== null)
			{
				edge1.PrevInAEL.NextInAEL = edge1;
			}
			edge2.NextInAEL = next2;
			if (edge2.NextInAEL !== null)
			{
				edge2.NextInAEL.PrevInAEL = edge2;
			}
			edge2.PrevInAEL = prev2;
			if (edge2.PrevInAEL !== null)
			{
				edge2.PrevInAEL.NextInAEL = edge2;
			}
		}

		if (edge1.PrevInAEL === null)
		{
			this.m_ActiveEdges = edge1;
		}
		else
		{
			if (edge2.PrevInAEL === null)
			{
				this.m_ActiveEdges = edge2;
			}
		}
	};

	ClipperLib.ClipperBase.prototype.DeleteFromAEL = function (e)
	{
		var AelPrev = e.PrevInAEL;
		var AelNext = e.NextInAEL;
		if (AelPrev === null && AelNext === null && e !== this.m_ActiveEdges)
		{
			return;
		} //already deleted
		if (AelPrev !== null)
		{
			AelPrev.NextInAEL = AelNext;
		}
		else
		{
			this.m_ActiveEdges = AelNext;
		}
		if (AelNext !== null)
		{
			AelNext.PrevInAEL = AelPrev;
		}
		e.NextInAEL = null;
		e.PrevInAEL = null;
	};

	// public Clipper(int InitOptions = 0)
	/**
	 * @suppress {missingProperties}
	 */
	ClipperLib.Clipper = function (InitOptions)
	{
		if (typeof (InitOptions) === "undefined") InitOptions = 0;
		this.m_PolyOuts = null;
		this.m_ClipType = ClipperLib.ClipType.ctIntersection;
		this.m_Scanbeam = null;
		this.m_Maxima = null;
		this.m_ActiveEdges = null;
		this.m_SortedEdges = null;
		this.m_IntersectList = null;
		this.m_IntersectNodeComparer = null;
		this.m_ExecuteLocked = false;
		this.m_ClipFillType = ClipperLib.PolyFillType.pftEvenOdd;
		this.m_SubjFillType = ClipperLib.PolyFillType.pftEvenOdd;
		this.m_Joins = null;
		this.m_GhostJoins = null;
		this.m_UsingPolyTree = false;
		this.ReverseSolution = false;
		this.StrictlySimple = false;

		ClipperLib.ClipperBase.call(this);

		this.m_Scanbeam = null;
		this.m_Maxima = null;
		this.m_ActiveEdges = null;
		this.m_SortedEdges = null;
		this.m_IntersectList = new Array();
		this.m_IntersectNodeComparer = ClipperLib.MyIntersectNodeSort.Compare;
		this.m_ExecuteLocked = false;
		this.m_UsingPolyTree = false;
		this.m_PolyOuts = new Array();
		this.m_Joins = new Array();
		this.m_GhostJoins = new Array();
		this.ReverseSolution = (1 & InitOptions) !== 0;
		this.StrictlySimple = (2 & InitOptions) !== 0;
		this.PreserveCollinear = (4 & InitOptions) !== 0;
		if (ClipperLib.use_xyz)
		{
			this.ZFillFunction = null; // function (IntPoint vert1, IntPoint vert2, ref IntPoint intersectPt);
		}
	};

	ClipperLib.Clipper.ioReverseSolution = 1;
	ClipperLib.Clipper.ioStrictlySimple = 2;
	ClipperLib.Clipper.ioPreserveCollinear = 4;

	ClipperLib.Clipper.prototype.Clear = function ()
	{
		if (this.m_edges.length === 0)
			return;
		//avoids problems with ClipperBase destructor
		this.DisposeAllPolyPts();
		ClipperLib.ClipperBase.prototype.Clear.call(this);
	};

	ClipperLib.Clipper.prototype.InsertMaxima = function (X)
	{
		//double-linked list: sorted ascending, ignoring dups.
		var newMax = new ClipperLib.Maxima();
		newMax.X = X;
		if (this.m_Maxima === null)
		{
			this.m_Maxima = newMax;
			this.m_Maxima.Next = null;
			this.m_Maxima.Prev = null;
		}
		else if (X < this.m_Maxima.X)
		{
			newMax.Next = this.m_Maxima;
			newMax.Prev = null;
			this.m_Maxima = newMax;
		}
		else
		{
			var m = this.m_Maxima;
			while (m.Next !== null && X >= m.Next.X)
			{
				m = m.Next;
			}
			if (X === m.X)
			{
				return;
			} //ie ignores duplicates (& CG to clean up newMax)
			//insert newMax between m and m.Next ...
			newMax.Next = m.Next;
			newMax.Prev = m;
			if (m.Next !== null)
			{
				m.Next.Prev = newMax;
			}
			m.Next = newMax;
		}
	};

	// ************************************
	ClipperLib.Clipper.prototype.Execute = function ()
	{
		var a = arguments,
			alen = a.length,
			ispolytree = a[1] instanceof ClipperLib.PolyTree;
		if (alen === 4 && !ispolytree) // function (clipType, solution, subjFillType, clipFillType)
		{
			var clipType = a[0],
				solution = a[1],
				subjFillType = a[2],
				clipFillType = a[3];
			if (this.m_ExecuteLocked)
				return false;
			if (this.m_HasOpenPaths)
				ClipperLib.Error("Error: PolyTree struct is needed for open path clipping.");
			this.m_ExecuteLocked = true;
			ClipperLib.Clear(solution);
			this.m_SubjFillType = subjFillType;
			this.m_ClipFillType = clipFillType;
			this.m_ClipType = clipType;
			this.m_UsingPolyTree = false;
			try
			{
				var succeeded = this.ExecuteInternal();
				//build the return polygons ...
				if (succeeded) this.BuildResult(solution);
			}
			finally
			{
				this.DisposeAllPolyPts();
				this.m_ExecuteLocked = false;
			}
			return succeeded;
		}
		else if (alen === 4 && ispolytree) // function (clipType, polytree, subjFillType, clipFillType)
		{
			var clipType = a[0],
				polytree = a[1],
				subjFillType = a[2],
				clipFillType = a[3];
			if (this.m_ExecuteLocked)
				return false;
			this.m_ExecuteLocked = true;
			this.m_SubjFillType = subjFillType;
			this.m_ClipFillType = clipFillType;
			this.m_ClipType = clipType;
			this.m_UsingPolyTree = true;
			try
			{
				var succeeded = this.ExecuteInternal();
				//build the return polygons ...
				if (succeeded) this.BuildResult2(polytree);
			}
			finally
			{
				this.DisposeAllPolyPts();
				this.m_ExecuteLocked = false;
			}
			return succeeded;
		}
		else if (alen === 2 && !ispolytree) // function (clipType, solution)
		{
			var clipType = a[0],
				solution = a[1];
			return this.Execute(clipType, solution, ClipperLib.PolyFillType.pftEvenOdd, ClipperLib.PolyFillType.pftEvenOdd);
		}
		else if (alen === 2 && ispolytree) // function (clipType, polytree)
		{
			var clipType = a[0],
				polytree = a[1];
			return this.Execute(clipType, polytree, ClipperLib.PolyFillType.pftEvenOdd, ClipperLib.PolyFillType.pftEvenOdd);
		}
	};

	ClipperLib.Clipper.prototype.FixHoleLinkage = function (outRec)
	{
		//skip if an outermost polygon or
		//already already points to the correct FirstLeft ...
		if (outRec.FirstLeft === null || (outRec.IsHole !== outRec.FirstLeft.IsHole && outRec.FirstLeft.Pts !== null))
			return;
		var orfl = outRec.FirstLeft;
		while (orfl !== null && ((orfl.IsHole === outRec.IsHole) || orfl.Pts === null))
			orfl = orfl.FirstLeft;
		outRec.FirstLeft = orfl;
	};

	ClipperLib.Clipper.prototype.ExecuteInternal = function ()
	{
		try
		{
			this.Reset();
			this.m_SortedEdges = null;
			this.m_Maxima = null;

			var botY = {},
				topY = {};

			if (!this.PopScanbeam(botY))
			{
				return false;
			}
			this.InsertLocalMinimaIntoAEL(botY.v);
			while (this.PopScanbeam(topY) || this.LocalMinimaPending())
			{
				this.ProcessHorizontals();
				this.m_GhostJoins.length = 0;
				if (!this.ProcessIntersections(topY.v))
				{
					return false;
				}
				this.ProcessEdgesAtTopOfScanbeam(topY.v);
				botY.v = topY.v;
				this.InsertLocalMinimaIntoAEL(botY.v);
			}

			//fix orientations ...
			var outRec, i, ilen;
			//fix orientations ...
			for (i = 0, ilen = this.m_PolyOuts.length; i < ilen; i++)
			{
				outRec = this.m_PolyOuts[i];
				if (outRec.Pts === null || outRec.IsOpen) continue;
				if ((outRec.IsHole ^ this.ReverseSolution) == (this.Area$1(outRec) > 0))
					this.ReversePolyPtLinks(outRec.Pts);
			}

			this.JoinCommonEdges();

			for (i = 0, ilen = this.m_PolyOuts.length; i < ilen; i++)
			{
				outRec = this.m_PolyOuts[i];
				if (outRec.Pts === null)
					continue;
				else if (outRec.IsOpen)
					this.FixupOutPolyline(outRec);
				else
					this.FixupOutPolygon(outRec);
			}

			if (this.StrictlySimple) this.DoSimplePolygons();
			return true;
		}
		//catch { return false; }
		finally
		{
			this.m_Joins.length = 0;
			this.m_GhostJoins.length = 0;
		}
	};

	ClipperLib.Clipper.prototype.DisposeAllPolyPts = function ()
	{
		for (var i = 0, ilen = this.m_PolyOuts.length; i < ilen; ++i)
			this.DisposeOutRec(i);
		ClipperLib.Clear(this.m_PolyOuts);
	};

	ClipperLib.Clipper.prototype.AddJoin = function (Op1, Op2, OffPt)
	{
		var j = new ClipperLib.Join();
		j.OutPt1 = Op1;
		j.OutPt2 = Op2;
		//j.OffPt = OffPt;
		j.OffPt.X = OffPt.X;
		j.OffPt.Y = OffPt.Y;
		if (ClipperLib.use_xyz) j.OffPt.Z = OffPt.Z;
		this.m_Joins.push(j);
	};

	ClipperLib.Clipper.prototype.AddGhostJoin = function (Op, OffPt)
	{
		var j = new ClipperLib.Join();
		j.OutPt1 = Op;
		//j.OffPt = OffPt;
		j.OffPt.X = OffPt.X;
		j.OffPt.Y = OffPt.Y;
		if (ClipperLib.use_xyz) j.OffPt.Z = OffPt.Z;
		this.m_GhostJoins.push(j);
	};

	//if (ClipperLib.use_xyz)
	//{
	ClipperLib.Clipper.prototype.SetZ = function (pt, e1, e2)
	{
		if (this.ZFillFunction !== null)
		{
			if (pt.Z !== 0 || this.ZFillFunction === null) return;
			else if (ClipperLib.IntPoint.op_Equality(pt, e1.Bot)) pt.Z = e1.Bot.Z;
			else if (ClipperLib.IntPoint.op_Equality(pt, e1.Top)) pt.Z = e1.Top.Z;
			else if (ClipperLib.IntPoint.op_Equality(pt, e2.Bot)) pt.Z = e2.Bot.Z;
			else if (ClipperLib.IntPoint.op_Equality(pt, e2.Top)) pt.Z = e2.Top.Z;
			else this.ZFillFunction(e1.Bot, e1.Top, e2.Bot, e2.Top, pt);
		}
	};
	//}

	ClipperLib.Clipper.prototype.InsertLocalMinimaIntoAEL = function (botY)
	{
		var lm = {};

		var lb;
		var rb;
		while (this.PopLocalMinima(botY, lm))
		{
			lb = lm.v.LeftBound;
			rb = lm.v.RightBound;

			var Op1 = null;
			if (lb === null)
			{
				this.InsertEdgeIntoAEL(rb, null);
				this.SetWindingCount(rb);
				if (this.IsContributing(rb))
					Op1 = this.AddOutPt(rb, rb.Bot);
			}
			else if (rb === null)
			{
				this.InsertEdgeIntoAEL(lb, null);
				this.SetWindingCount(lb);
				if (this.IsContributing(lb))
					Op1 = this.AddOutPt(lb, lb.Bot);
				this.InsertScanbeam(lb.Top.Y);
			}
			else
			{
				this.InsertEdgeIntoAEL(lb, null);
				this.InsertEdgeIntoAEL(rb, lb);
				this.SetWindingCount(lb);
				rb.WindCnt = lb.WindCnt;
				rb.WindCnt2 = lb.WindCnt2;
				if (this.IsContributing(lb))
					Op1 = this.AddLocalMinPoly(lb, rb, lb.Bot);
				this.InsertScanbeam(lb.Top.Y);
			}
			if (rb !== null)
			{
				if (ClipperLib.ClipperBase.IsHorizontal(rb))
				{
					if (rb.NextInLML !== null)
					{
						this.InsertScanbeam(rb.NextInLML.Top.Y);
					}
					this.AddEdgeToSEL(rb);
				}
				else
				{
					this.InsertScanbeam(rb.Top.Y);
				}
			}
			if (lb === null || rb === null) continue;
			//if output polygons share an Edge with a horizontal rb, they'll need joining later ...
			if (Op1 !== null && ClipperLib.ClipperBase.IsHorizontal(rb) && this.m_GhostJoins.length > 0 && rb.WindDelta !== 0)
			{
				for (var i = 0, ilen = this.m_GhostJoins.length; i < ilen; i++)
				{
					//if the horizontal Rb and a 'ghost' horizontal overlap, then convert
					//the 'ghost' join to a real join ready for later ...
					var j = this.m_GhostJoins[i];

					if (this.HorzSegmentsOverlap(j.OutPt1.Pt.X, j.OffPt.X, rb.Bot.X, rb.Top.X))
						this.AddJoin(j.OutPt1, Op1, j.OffPt);
				}
			}

			if (lb.OutIdx >= 0 && lb.PrevInAEL !== null &&
				lb.PrevInAEL.Curr.X === lb.Bot.X &&
				lb.PrevInAEL.OutIdx >= 0 &&
				ClipperLib.ClipperBase.SlopesEqual5(lb.PrevInAEL.Curr, lb.PrevInAEL.Top, lb.Curr, lb.Top, this.m_UseFullRange) &&
				lb.WindDelta !== 0 && lb.PrevInAEL.WindDelta !== 0)
			{
				var Op2 = this.AddOutPt(lb.PrevInAEL, lb.Bot);
				this.AddJoin(Op1, Op2, lb.Top);
			}
			if (lb.NextInAEL !== rb)
			{
				if (rb.OutIdx >= 0 && rb.PrevInAEL.OutIdx >= 0 &&
					ClipperLib.ClipperBase.SlopesEqual5(rb.PrevInAEL.Curr, rb.PrevInAEL.Top, rb.Curr, rb.Top, this.m_UseFullRange) &&
					rb.WindDelta !== 0 && rb.PrevInAEL.WindDelta !== 0)
				{
					var Op2 = this.AddOutPt(rb.PrevInAEL, rb.Bot);
					this.AddJoin(Op1, Op2, rb.Top);
				}
				var e = lb.NextInAEL;
				if (e !== null)
					while (e !== rb)
					{
						//nb: For calculating winding counts etc, IntersectEdges() assumes
						//that param1 will be to the right of param2 ABOVE the intersection ...
						this.IntersectEdges(rb, e, lb.Curr);
						//order important here
						e = e.NextInAEL;
					}
			}
		}
	};

	ClipperLib.Clipper.prototype.InsertEdgeIntoAEL = function (edge, startEdge)
	{
		if (this.m_ActiveEdges === null)
		{
			edge.PrevInAEL = null;
			edge.NextInAEL = null;
			this.m_ActiveEdges = edge;
		}
		else if (startEdge === null && this.E2InsertsBeforeE1(this.m_ActiveEdges, edge))
		{
			edge.PrevInAEL = null;
			edge.NextInAEL = this.m_ActiveEdges;
			this.m_ActiveEdges.PrevInAEL = edge;
			this.m_ActiveEdges = edge;
		}
		else
		{
			if (startEdge === null)
				startEdge = this.m_ActiveEdges;
			while (startEdge.NextInAEL !== null && !this.E2InsertsBeforeE1(startEdge.NextInAEL, edge))
				startEdge = startEdge.NextInAEL;
			edge.NextInAEL = startEdge.NextInAEL;
			if (startEdge.NextInAEL !== null)
				startEdge.NextInAEL.PrevInAEL = edge;
			edge.PrevInAEL = startEdge;
			startEdge.NextInAEL = edge;
		}
	};

	ClipperLib.Clipper.prototype.E2InsertsBeforeE1 = function (e1, e2)
	{
		if (e2.Curr.X === e1.Curr.X)
		{
			if (e2.Top.Y > e1.Top.Y)
				return e2.Top.X < ClipperLib.Clipper.TopX(e1, e2.Top.Y);
			else
				return e1.Top.X > ClipperLib.Clipper.TopX(e2, e1.Top.Y);
		}
		else
			return e2.Curr.X < e1.Curr.X;
	};

	ClipperLib.Clipper.prototype.IsEvenOddFillType = function (edge)
	{
		if (edge.PolyTyp === ClipperLib.PolyType.ptSubject)
			return this.m_SubjFillType === ClipperLib.PolyFillType.pftEvenOdd;
		else
			return this.m_ClipFillType === ClipperLib.PolyFillType.pftEvenOdd;
	};

	ClipperLib.Clipper.prototype.IsEvenOddAltFillType = function (edge)
	{
		if (edge.PolyTyp === ClipperLib.PolyType.ptSubject)
			return this.m_ClipFillType === ClipperLib.PolyFillType.pftEvenOdd;
		else
			return this.m_SubjFillType === ClipperLib.PolyFillType.pftEvenOdd;
	};

	ClipperLib.Clipper.prototype.IsContributing = function (edge)
	{
		var pft, pft2;
		if (edge.PolyTyp === ClipperLib.PolyType.ptSubject)
		{
			pft = this.m_SubjFillType;
			pft2 = this.m_ClipFillType;
		}
		else
		{
			pft = this.m_ClipFillType;
			pft2 = this.m_SubjFillType;
		}
		switch (pft)
		{
		case ClipperLib.PolyFillType.pftEvenOdd:
			if (edge.WindDelta === 0 && edge.WindCnt !== 1)
				return false;
			break;
		case ClipperLib.PolyFillType.pftNonZero:
			if (Math.abs(edge.WindCnt) !== 1)
				return false;
			break;
		case ClipperLib.PolyFillType.pftPositive:
			if (edge.WindCnt !== 1)
				return false;
			break;
		default:
			if (edge.WindCnt !== -1)
				return false;
			break;
		}
		switch (this.m_ClipType)
		{
		case ClipperLib.ClipType.ctIntersection:
			switch (pft2)
			{
			case ClipperLib.PolyFillType.pftEvenOdd:
			case ClipperLib.PolyFillType.pftNonZero:
				return (edge.WindCnt2 !== 0);
			case ClipperLib.PolyFillType.pftPositive:
				return (edge.WindCnt2 > 0);
			default:
				return (edge.WindCnt2 < 0);
			}
		case ClipperLib.ClipType.ctUnion:
			switch (pft2)
			{
			case ClipperLib.PolyFillType.pftEvenOdd:
			case ClipperLib.PolyFillType.pftNonZero:
				return (edge.WindCnt2 === 0);
			case ClipperLib.PolyFillType.pftPositive:
				return (edge.WindCnt2 <= 0);
			default:
				return (edge.WindCnt2 >= 0);
			}
		case ClipperLib.ClipType.ctDifference:
			if (edge.PolyTyp === ClipperLib.PolyType.ptSubject)
				switch (pft2)
				{
				case ClipperLib.PolyFillType.pftEvenOdd:
				case ClipperLib.PolyFillType.pftNonZero:
					return (edge.WindCnt2 === 0);
				case ClipperLib.PolyFillType.pftPositive:
					return (edge.WindCnt2 <= 0);
				default:
					return (edge.WindCnt2 >= 0);
				}
			else
				switch (pft2)
				{
				case ClipperLib.PolyFillType.pftEvenOdd:
				case ClipperLib.PolyFillType.pftNonZero:
					return (edge.WindCnt2 !== 0);
				case ClipperLib.PolyFillType.pftPositive:
					return (edge.WindCnt2 > 0);
				default:
					return (edge.WindCnt2 < 0);
				}
		case ClipperLib.ClipType.ctXor:
			if (edge.WindDelta === 0)
				switch (pft2)
				{
				case ClipperLib.PolyFillType.pftEvenOdd:
				case ClipperLib.PolyFillType.pftNonZero:
					return (edge.WindCnt2 === 0);
				case ClipperLib.PolyFillType.pftPositive:
					return (edge.WindCnt2 <= 0);
				default:
					return (edge.WindCnt2 >= 0);
				}
			else
				return true;
		}
		return true;
	};

	ClipperLib.Clipper.prototype.SetWindingCount = function (edge)
	{
		var e = edge.PrevInAEL;
		//find the edge of the same polytype that immediately preceeds 'edge' in AEL
		while (e !== null && ((e.PolyTyp !== edge.PolyTyp) || (e.WindDelta === 0)))
			e = e.PrevInAEL;
		if (e === null)
		{
			var pft = (edge.PolyTyp === ClipperLib.PolyType.ptSubject ? this.m_SubjFillType : this.m_ClipFillType);
			if (edge.WindDelta === 0)
			{
				edge.WindCnt = (pft === ClipperLib.PolyFillType.pftNegative ? -1 : 1);
			}
			else
			{
				edge.WindCnt = edge.WindDelta;
			}
			edge.WindCnt2 = 0;
			e = this.m_ActiveEdges;
			//ie get ready to calc WindCnt2
		}
		else if (edge.WindDelta === 0 && this.m_ClipType !== ClipperLib.ClipType.ctUnion)
		{
			edge.WindCnt = 1;
			edge.WindCnt2 = e.WindCnt2;
			e = e.NextInAEL;
			//ie get ready to calc WindCnt2
		}
		else if (this.IsEvenOddFillType(edge))
		{
			//EvenOdd filling ...
			if (edge.WindDelta === 0)
			{
				//are we inside a subj polygon ...
				var Inside = true;
				var e2 = e.PrevInAEL;
				while (e2 !== null)
				{
					if (e2.PolyTyp === e.PolyTyp && e2.WindDelta !== 0)
						Inside = !Inside;
					e2 = e2.PrevInAEL;
				}
				edge.WindCnt = (Inside ? 0 : 1);
			}
			else
			{
				edge.WindCnt = edge.WindDelta;
			}
			edge.WindCnt2 = e.WindCnt2;
			e = e.NextInAEL;
			//ie get ready to calc WindCnt2
		}
		else
		{
			//nonZero, Positive or Negative filling ...
			if (e.WindCnt * e.WindDelta < 0)
			{
				//prev edge is 'decreasing' WindCount (WC) toward zero
				//so we're outside the previous polygon ...
				if (Math.abs(e.WindCnt) > 1)
				{
					//outside prev poly but still inside another.
					//when reversing direction of prev poly use the same WC
					if (e.WindDelta * edge.WindDelta < 0)
						edge.WindCnt = e.WindCnt;
					else
						edge.WindCnt = e.WindCnt + edge.WindDelta;
				}
				else
					edge.WindCnt = (edge.WindDelta === 0 ? 1 : edge.WindDelta);
			}
			else
			{
				//prev edge is 'increasing' WindCount (WC) away from zero
				//so we're inside the previous polygon ...
				if (edge.WindDelta === 0)
					edge.WindCnt = (e.WindCnt < 0 ? e.WindCnt - 1 : e.WindCnt + 1);
				else if (e.WindDelta * edge.WindDelta < 0)
					edge.WindCnt = e.WindCnt;
				else
					edge.WindCnt = e.WindCnt + edge.WindDelta;
			}
			edge.WindCnt2 = e.WindCnt2;
			e = e.NextInAEL;
			//ie get ready to calc WindCnt2
		}
		//update WindCnt2 ...
		if (this.IsEvenOddAltFillType(edge))
		{
			//EvenOdd filling ...
			while (e !== edge)
			{
				if (e.WindDelta !== 0)
					edge.WindCnt2 = (edge.WindCnt2 === 0 ? 1 : 0);
				e = e.NextInAEL;
			}
		}
		else
		{
			//nonZero, Positive or Negative filling ...
			while (e !== edge)
			{
				edge.WindCnt2 += e.WindDelta;
				e = e.NextInAEL;
			}
		}
	};

	ClipperLib.Clipper.prototype.AddEdgeToSEL = function (edge)
	{
		//SEL pointers in PEdge are use to build transient lists of horizontal edges.
		//However, since we don't need to worry about processing order, all additions
		//are made to the front of the list ...
		if (this.m_SortedEdges === null)
		{
			this.m_SortedEdges = edge;
			edge.PrevInSEL = null;
			edge.NextInSEL = null;
		}
		else
		{
			edge.NextInSEL = this.m_SortedEdges;
			edge.PrevInSEL = null;
			this.m_SortedEdges.PrevInSEL = edge;
			this.m_SortedEdges = edge;
		}
	};

	ClipperLib.Clipper.prototype.PopEdgeFromSEL = function (e)
	{
		//Pop edge from front of SEL (ie SEL is a FILO list)
		e.v = this.m_SortedEdges;
		if (e.v === null)
		{
			return false;
		}
		var oldE = e.v;
		this.m_SortedEdges = e.v.NextInSEL;
		if (this.m_SortedEdges !== null)
		{
			this.m_SortedEdges.PrevInSEL = null;
		}
		oldE.NextInSEL = null;
		oldE.PrevInSEL = null;
		return true;
	};

	ClipperLib.Clipper.prototype.CopyAELToSEL = function ()
	{
		var e = this.m_ActiveEdges;
		this.m_SortedEdges = e;
		while (e !== null)
		{
			e.PrevInSEL = e.PrevInAEL;
			e.NextInSEL = e.NextInAEL;
			e = e.NextInAEL;
		}
	};

	ClipperLib.Clipper.prototype.SwapPositionsInSEL = function (edge1, edge2)
	{
		if (edge1.NextInSEL === null && edge1.PrevInSEL === null)
			return;
		if (edge2.NextInSEL === null && edge2.PrevInSEL === null)
			return;
		if (edge1.NextInSEL === edge2)
		{
			var next = edge2.NextInSEL;
			if (next !== null)
				next.PrevInSEL = edge1;
			var prev = edge1.PrevInSEL;
			if (prev !== null)
				prev.NextInSEL = edge2;
			edge2.PrevInSEL = prev;
			edge2.NextInSEL = edge1;
			edge1.PrevInSEL = edge2;
			edge1.NextInSEL = next;
		}
		else if (edge2.NextInSEL === edge1)
		{
			var next = edge1.NextInSEL;
			if (next !== null)
				next.PrevInSEL = edge2;
			var prev = edge2.PrevInSEL;
			if (prev !== null)
				prev.NextInSEL = edge1;
			edge1.PrevInSEL = prev;
			edge1.NextInSEL = edge2;
			edge2.PrevInSEL = edge1;
			edge2.NextInSEL = next;
		}
		else
		{
			var next = edge1.NextInSEL;
			var prev = edge1.PrevInSEL;
			edge1.NextInSEL = edge2.NextInSEL;
			if (edge1.NextInSEL !== null)
				edge1.NextInSEL.PrevInSEL = edge1;
			edge1.PrevInSEL = edge2.PrevInSEL;
			if (edge1.PrevInSEL !== null)
				edge1.PrevInSEL.NextInSEL = edge1;
			edge2.NextInSEL = next;
			if (edge2.NextInSEL !== null)
				edge2.NextInSEL.PrevInSEL = edge2;
			edge2.PrevInSEL = prev;
			if (edge2.PrevInSEL !== null)
				edge2.PrevInSEL.NextInSEL = edge2;
		}
		if (edge1.PrevInSEL === null)
			this.m_SortedEdges = edge1;
		else if (edge2.PrevInSEL === null)
			this.m_SortedEdges = edge2;
	};

	ClipperLib.Clipper.prototype.AddLocalMaxPoly = function (e1, e2, pt)
	{
		this.AddOutPt(e1, pt);
		if (e2.WindDelta === 0) this.AddOutPt(e2, pt);
		if (e1.OutIdx === e2.OutIdx)
		{
			e1.OutIdx = -1;
			e2.OutIdx = -1;
		}
		else if (e1.OutIdx < e2.OutIdx)
			this.AppendPolygon(e1, e2);
		else
			this.AppendPolygon(e2, e1);
	};

	ClipperLib.Clipper.prototype.AddLocalMinPoly = function (e1, e2, pt)
	{
		var result;
		var e, prevE;
		if (ClipperLib.ClipperBase.IsHorizontal(e2) || (e1.Dx > e2.Dx))
		{
			result = this.AddOutPt(e1, pt);
			e2.OutIdx = e1.OutIdx;
			e1.Side = ClipperLib.EdgeSide.esLeft;
			e2.Side = ClipperLib.EdgeSide.esRight;
			e = e1;
			if (e.PrevInAEL === e2)
				prevE = e2.PrevInAEL;
			else
				prevE = e.PrevInAEL;
		}
		else
		{
			result = this.AddOutPt(e2, pt);
			e1.OutIdx = e2.OutIdx;
			e1.Side = ClipperLib.EdgeSide.esRight;
			e2.Side = ClipperLib.EdgeSide.esLeft;
			e = e2;
			if (e.PrevInAEL === e1)
				prevE = e1.PrevInAEL;
			else
				prevE = e.PrevInAEL;
		}

		if (prevE !== null && prevE.OutIdx >= 0 && prevE.Top.Y < pt.Y && e.Top.Y < pt.Y)
		{
			var xPrev = ClipperLib.Clipper.TopX(prevE, pt.Y);
			var xE = ClipperLib.Clipper.TopX(e, pt.Y);
			if ((xPrev === xE) && (e.WindDelta !== 0) && (prevE.WindDelta !== 0) && ClipperLib.ClipperBase.SlopesEqual5(new ClipperLib.IntPoint2(xPrev, pt.Y), prevE.Top, new ClipperLib.IntPoint2(xE, pt.Y), e.Top, this.m_UseFullRange))
			{
				var outPt = this.AddOutPt(prevE, pt);
				this.AddJoin(result, outPt, e.Top);
			}
		}
		return result;
	};

	ClipperLib.Clipper.prototype.AddOutPt = function (e, pt)
	{
		if (e.OutIdx < 0)
		{
			var outRec = this.CreateOutRec();
			outRec.IsOpen = (e.WindDelta === 0);
			var newOp = new ClipperLib.OutPt();
			outRec.Pts = newOp;
			newOp.Idx = outRec.Idx;
			//newOp.Pt = pt;
			newOp.Pt.X = pt.X;
			newOp.Pt.Y = pt.Y;
			if (ClipperLib.use_xyz) newOp.Pt.Z = pt.Z;
			newOp.Next = newOp;
			newOp.Prev = newOp;
			if (!outRec.IsOpen)
				this.SetHoleState(e, outRec);
			e.OutIdx = outRec.Idx;
			//nb: do this after SetZ !
			return newOp;
		}
		else
		{
			var outRec = this.m_PolyOuts[e.OutIdx];
			//OutRec.Pts is the 'Left-most' point & OutRec.Pts.Prev is the 'Right-most'
			var op = outRec.Pts;
			var ToFront = (e.Side === ClipperLib.EdgeSide.esLeft);
			if (ToFront && ClipperLib.IntPoint.op_Equality(pt, op.Pt))
				return op;
			else if (!ToFront && ClipperLib.IntPoint.op_Equality(pt, op.Prev.Pt))
				return op.Prev;
			var newOp = new ClipperLib.OutPt();
			newOp.Idx = outRec.Idx;
			//newOp.Pt = pt;
			newOp.Pt.X = pt.X;
			newOp.Pt.Y = pt.Y;
			if (ClipperLib.use_xyz) newOp.Pt.Z = pt.Z;
			newOp.Next = op;
			newOp.Prev = op.Prev;
			newOp.Prev.Next = newOp;
			op.Prev = newOp;
			if (ToFront)
				outRec.Pts = newOp;
			return newOp;
		}
	};

	ClipperLib.Clipper.prototype.GetLastOutPt = function (e)
	{
		var outRec = this.m_PolyOuts[e.OutIdx];
		if (e.Side === ClipperLib.EdgeSide.esLeft)
		{
			return outRec.Pts;
		}
		else
		{
			return outRec.Pts.Prev;
		}
	};

	ClipperLib.Clipper.prototype.SwapPoints = function (pt1, pt2)
	{
		var tmp = new ClipperLib.IntPoint1(pt1.Value);
		//pt1.Value = pt2.Value;
		pt1.Value.X = pt2.Value.X;
		pt1.Value.Y = pt2.Value.Y;
		if (ClipperLib.use_xyz) pt1.Value.Z = pt2.Value.Z;
		//pt2.Value = tmp;
		pt2.Value.X = tmp.X;
		pt2.Value.Y = tmp.Y;
		if (ClipperLib.use_xyz) pt2.Value.Z = tmp.Z;
	};

	ClipperLib.Clipper.prototype.HorzSegmentsOverlap = function (seg1a, seg1b, seg2a, seg2b)
	{
		var tmp;
		if (seg1a > seg1b)
		{
			tmp = seg1a;
			seg1a = seg1b;
			seg1b = tmp;
		}
		if (seg2a > seg2b)
		{
			tmp = seg2a;
			seg2a = seg2b;
			seg2b = tmp;
		}
		return (seg1a < seg2b) && (seg2a < seg1b);
	};

	ClipperLib.Clipper.prototype.SetHoleState = function (e, outRec)
	{
		var e2 = e.PrevInAEL;
		var eTmp = null;
		while (e2 !== null)
		{
			if (e2.OutIdx >= 0 && e2.WindDelta !== 0)
			{
				if (eTmp === null)
					eTmp = e2;
				else if (eTmp.OutIdx === e2.OutIdx)
					eTmp = null; //paired
			}
			e2 = e2.PrevInAEL;
		}

		if (eTmp === null)
		{
			outRec.FirstLeft = null;
			outRec.IsHole = false;
		}
		else
		{
			outRec.FirstLeft = this.m_PolyOuts[eTmp.OutIdx];
			outRec.IsHole = !outRec.FirstLeft.IsHole;
		}
	};

	ClipperLib.Clipper.prototype.GetDx = function (pt1, pt2)
	{
		if (pt1.Y === pt2.Y)
			return ClipperLib.ClipperBase.horizontal;
		else
			return (pt2.X - pt1.X) / (pt2.Y - pt1.Y);
	};

	ClipperLib.Clipper.prototype.FirstIsBottomPt = function (btmPt1, btmPt2)
	{
		var p = btmPt1.Prev;
		while ((ClipperLib.IntPoint.op_Equality(p.Pt, btmPt1.Pt)) && (p !== btmPt1))
			p = p.Prev;
		var dx1p = Math.abs(this.GetDx(btmPt1.Pt, p.Pt));
		p = btmPt1.Next;
		while ((ClipperLib.IntPoint.op_Equality(p.Pt, btmPt1.Pt)) && (p !== btmPt1))
			p = p.Next;
		var dx1n = Math.abs(this.GetDx(btmPt1.Pt, p.Pt));
		p = btmPt2.Prev;
		while ((ClipperLib.IntPoint.op_Equality(p.Pt, btmPt2.Pt)) && (p !== btmPt2))
			p = p.Prev;
		var dx2p = Math.abs(this.GetDx(btmPt2.Pt, p.Pt));
		p = btmPt2.Next;
		while ((ClipperLib.IntPoint.op_Equality(p.Pt, btmPt2.Pt)) && (p !== btmPt2))
			p = p.Next;
		var dx2n = Math.abs(this.GetDx(btmPt2.Pt, p.Pt));

		if (Math.max(dx1p, dx1n) === Math.max(dx2p, dx2n) && Math.min(dx1p, dx1n) === Math.min(dx2p, dx2n))
		{
			return this.Area(btmPt1) > 0; //if otherwise identical use orientation
		}
		else
		{
			return (dx1p >= dx2p && dx1p >= dx2n) || (dx1n >= dx2p && dx1n >= dx2n);
		}
	};

	ClipperLib.Clipper.prototype.GetBottomPt = function (pp)
	{
		var dups = null;
		var p = pp.Next;
		while (p !== pp)
		{
			if (p.Pt.Y > pp.Pt.Y)
			{
				pp = p;
				dups = null;
			}
			else if (p.Pt.Y === pp.Pt.Y && p.Pt.X <= pp.Pt.X)
			{
				if (p.Pt.X < pp.Pt.X)
				{
					dups = null;
					pp = p;
				}
				else
				{
					if (p.Next !== pp && p.Prev !== pp)
						dups = p;
				}
			}
			p = p.Next;
		}
		if (dups !== null)
		{
			//there appears to be at least 2 vertices at bottomPt so ...
			while (dups !== p)
			{
				if (!this.FirstIsBottomPt(p, dups))
					pp = dups;
				dups = dups.Next;
				while (ClipperLib.IntPoint.op_Inequality(dups.Pt, pp.Pt))
					dups = dups.Next;
			}
		}
		return pp;
	};

	ClipperLib.Clipper.prototype.GetLowermostRec = function (outRec1, outRec2)
	{
		//work out which polygon fragment has the correct hole state ...
		if (outRec1.BottomPt === null)
			outRec1.BottomPt = this.GetBottomPt(outRec1.Pts);
		if (outRec2.BottomPt === null)
			outRec2.BottomPt = this.GetBottomPt(outRec2.Pts);
		var bPt1 = outRec1.BottomPt;
		var bPt2 = outRec2.BottomPt;
		if (bPt1.Pt.Y > bPt2.Pt.Y)
			return outRec1;
		else if (bPt1.Pt.Y < bPt2.Pt.Y)
			return outRec2;
		else if (bPt1.Pt.X < bPt2.Pt.X)
			return outRec1;
		else if (bPt1.Pt.X > bPt2.Pt.X)
			return outRec2;
		else if (bPt1.Next === bPt1)
			return outRec2;
		else if (bPt2.Next === bPt2)
			return outRec1;
		else if (this.FirstIsBottomPt(bPt1, bPt2))
			return outRec1;
		else
			return outRec2;
	};

	ClipperLib.Clipper.prototype.OutRec1RightOfOutRec2 = function (outRec1, outRec2)
	{
		do {
			outRec1 = outRec1.FirstLeft;
			if (outRec1 === outRec2)
				return true;
		}
		while (outRec1 !== null)
		return false;
	};

	ClipperLib.Clipper.prototype.GetOutRec = function (idx)
	{
		var outrec = this.m_PolyOuts[idx];
		while (outrec !== this.m_PolyOuts[outrec.Idx])
			outrec = this.m_PolyOuts[outrec.Idx];
		return outrec;
	};

	ClipperLib.Clipper.prototype.AppendPolygon = function (e1, e2)
	{
		//get the start and ends of both output polygons ...
		var outRec1 = this.m_PolyOuts[e1.OutIdx];
		var outRec2 = this.m_PolyOuts[e2.OutIdx];
		var holeStateRec;
		if (this.OutRec1RightOfOutRec2(outRec1, outRec2))
			holeStateRec = outRec2;
		else if (this.OutRec1RightOfOutRec2(outRec2, outRec1))
			holeStateRec = outRec1;
		else
			holeStateRec = this.GetLowermostRec(outRec1, outRec2);

		//get the start and ends of both output polygons and
		//join E2 poly onto E1 poly and delete pointers to E2 ...

		var p1_lft = outRec1.Pts;
		var p1_rt = p1_lft.Prev;
		var p2_lft = outRec2.Pts;
		var p2_rt = p2_lft.Prev;
		//join e2 poly onto e1 poly and delete pointers to e2 ...
		if (e1.Side === ClipperLib.EdgeSide.esLeft)
		{
			if (e2.Side === ClipperLib.EdgeSide.esLeft)
			{
				//z y x a b c
				this.ReversePolyPtLinks(p2_lft);
				p2_lft.Next = p1_lft;
				p1_lft.Prev = p2_lft;
				p1_rt.Next = p2_rt;
				p2_rt.Prev = p1_rt;
				outRec1.Pts = p2_rt;
			}
			else
			{
				//x y z a b c
				p2_rt.Next = p1_lft;
				p1_lft.Prev = p2_rt;
				p2_lft.Prev = p1_rt;
				p1_rt.Next = p2_lft;
				outRec1.Pts = p2_lft;
			}
		}
		else
		{
			if (e2.Side === ClipperLib.EdgeSide.esRight)
			{
				//a b c z y x
				this.ReversePolyPtLinks(p2_lft);
				p1_rt.Next = p2_rt;
				p2_rt.Prev = p1_rt;
				p2_lft.Next = p1_lft;
				p1_lft.Prev = p2_lft;
			}
			else
			{
				//a b c x y z
				p1_rt.Next = p2_lft;
				p2_lft.Prev = p1_rt;
				p1_lft.Prev = p2_rt;
				p2_rt.Next = p1_lft;
			}
		}
		outRec1.BottomPt = null;
		if (holeStateRec === outRec2)
		{
			if (outRec2.FirstLeft !== outRec1)
				outRec1.FirstLeft = outRec2.FirstLeft;
			outRec1.IsHole = outRec2.IsHole;
		}
		outRec2.Pts = null;
		outRec2.BottomPt = null;
		outRec2.FirstLeft = outRec1;
		var OKIdx = e1.OutIdx;
		var ObsoleteIdx = e2.OutIdx;
		e1.OutIdx = -1;
		//nb: safe because we only get here via AddLocalMaxPoly
		e2.OutIdx = -1;
		var e = this.m_ActiveEdges;
		while (e !== null)
		{
			if (e.OutIdx === ObsoleteIdx)
			{
				e.OutIdx = OKIdx;
				e.Side = e1.Side;
				break;
			}
			e = e.NextInAEL;
		}
		outRec2.Idx = outRec1.Idx;
	};

	ClipperLib.Clipper.prototype.ReversePolyPtLinks = function (pp)
	{
		if (pp === null)
			return;
		var pp1;
		var pp2;
		pp1 = pp;
		do {
			pp2 = pp1.Next;
			pp1.Next = pp1.Prev;
			pp1.Prev = pp2;
			pp1 = pp2;
		}
		while (pp1 !== pp)
	};

	ClipperLib.Clipper.SwapSides = function (edge1, edge2)
	{
		var side = edge1.Side;
		edge1.Side = edge2.Side;
		edge2.Side = side;
	};

	ClipperLib.Clipper.SwapPolyIndexes = function (edge1, edge2)
	{
		var outIdx = edge1.OutIdx;
		edge1.OutIdx = edge2.OutIdx;
		edge2.OutIdx = outIdx;
	};

	ClipperLib.Clipper.prototype.IntersectEdges = function (e1, e2, pt)
	{
		//e1 will be to the left of e2 BELOW the intersection. Therefore e1 is before
		//e2 in AEL except when e1 is being inserted at the intersection point ...
		var e1Contributing = (e1.OutIdx >= 0);
		var e2Contributing = (e2.OutIdx >= 0);

		if (ClipperLib.use_xyz)
			this.SetZ(pt, e1, e2);

		if (ClipperLib.use_lines)
		{
			//if either edge is on an OPEN path ...
			if (e1.WindDelta === 0 || e2.WindDelta === 0)
			{
				//ignore subject-subject open path intersections UNLESS they
				//are both open paths, AND they are both 'contributing maximas' ...
				if (e1.WindDelta === 0 && e2.WindDelta === 0) return;
				//if intersecting a subj line with a subj poly ...
				else if (e1.PolyTyp === e2.PolyTyp &&
					e1.WindDelta !== e2.WindDelta && this.m_ClipType === ClipperLib.ClipType.ctUnion)
				{
					if (e1.WindDelta === 0)
					{
						if (e2Contributing)
						{
							this.AddOutPt(e1, pt);
							if (e1Contributing)
								e1.OutIdx = -1;
						}
					}
					else
					{
						if (e1Contributing)
						{
							this.AddOutPt(e2, pt);
							if (e2Contributing)
								e2.OutIdx = -1;
						}
					}
				}
				else if (e1.PolyTyp !== e2.PolyTyp)
				{
					if ((e1.WindDelta === 0) && Math.abs(e2.WindCnt) === 1 &&
						(this.m_ClipType !== ClipperLib.ClipType.ctUnion || e2.WindCnt2 === 0))
					{
						this.AddOutPt(e1, pt);
						if (e1Contributing)
							e1.OutIdx = -1;
					}
					else if ((e2.WindDelta === 0) && (Math.abs(e1.WindCnt) === 1) &&
						(this.m_ClipType !== ClipperLib.ClipType.ctUnion || e1.WindCnt2 === 0))
					{
						this.AddOutPt(e2, pt);
						if (e2Contributing)
							e2.OutIdx = -1;
					}
				}
				return;
			}
		}
		//update winding counts...
		//assumes that e1 will be to the Right of e2 ABOVE the intersection
		if (e1.PolyTyp === e2.PolyTyp)
		{
			if (this.IsEvenOddFillType(e1))
			{
				var oldE1WindCnt = e1.WindCnt;
				e1.WindCnt = e2.WindCnt;
				e2.WindCnt = oldE1WindCnt;
			}
			else
			{
				if (e1.WindCnt + e2.WindDelta === 0)
					e1.WindCnt = -e1.WindCnt;
				else
					e1.WindCnt += e2.WindDelta;
				if (e2.WindCnt - e1.WindDelta === 0)
					e2.WindCnt = -e2.WindCnt;
				else
					e2.WindCnt -= e1.WindDelta;
			}
		}
		else
		{
			if (!this.IsEvenOddFillType(e2))
				e1.WindCnt2 += e2.WindDelta;
			else
				e1.WindCnt2 = (e1.WindCnt2 === 0) ? 1 : 0;
			if (!this.IsEvenOddFillType(e1))
				e2.WindCnt2 -= e1.WindDelta;
			else
				e2.WindCnt2 = (e2.WindCnt2 === 0) ? 1 : 0;
		}
		var e1FillType, e2FillType, e1FillType2, e2FillType2;
		if (e1.PolyTyp === ClipperLib.PolyType.ptSubject)
		{
			e1FillType = this.m_SubjFillType;
			e1FillType2 = this.m_ClipFillType;
		}
		else
		{
			e1FillType = this.m_ClipFillType;
			e1FillType2 = this.m_SubjFillType;
		}
		if (e2.PolyTyp === ClipperLib.PolyType.ptSubject)
		{
			e2FillType = this.m_SubjFillType;
			e2FillType2 = this.m_ClipFillType;
		}
		else
		{
			e2FillType = this.m_ClipFillType;
			e2FillType2 = this.m_SubjFillType;
		}
		var e1Wc, e2Wc;
		switch (e1FillType)
		{
		case ClipperLib.PolyFillType.pftPositive:
			e1Wc = e1.WindCnt;
			break;
		case ClipperLib.PolyFillType.pftNegative:
			e1Wc = -e1.WindCnt;
			break;
		default:
			e1Wc = Math.abs(e1.WindCnt);
			break;
		}
		switch (e2FillType)
		{
		case ClipperLib.PolyFillType.pftPositive:
			e2Wc = e2.WindCnt;
			break;
		case ClipperLib.PolyFillType.pftNegative:
			e2Wc = -e2.WindCnt;
			break;
		default:
			e2Wc = Math.abs(e2.WindCnt);
			break;
		}
		if (e1Contributing && e2Contributing)
		{
			if ((e1Wc !== 0 && e1Wc !== 1) || (e2Wc !== 0 && e2Wc !== 1) ||
				(e1.PolyTyp !== e2.PolyTyp && this.m_ClipType !== ClipperLib.ClipType.ctXor))
			{
				this.AddLocalMaxPoly(e1, e2, pt);
			}
			else
			{
				this.AddOutPt(e1, pt);
				this.AddOutPt(e2, pt);
				ClipperLib.Clipper.SwapSides(e1, e2);
				ClipperLib.Clipper.SwapPolyIndexes(e1, e2);
			}
		}
		else if (e1Contributing)
		{
			if (e2Wc === 0 || e2Wc === 1)
			{
				this.AddOutPt(e1, pt);
				ClipperLib.Clipper.SwapSides(e1, e2);
				ClipperLib.Clipper.SwapPolyIndexes(e1, e2);
			}
		}
		else if (e2Contributing)
		{
			if (e1Wc === 0 || e1Wc === 1)
			{
				this.AddOutPt(e2, pt);
				ClipperLib.Clipper.SwapSides(e1, e2);
				ClipperLib.Clipper.SwapPolyIndexes(e1, e2);
			}
		}
		else if ((e1Wc === 0 || e1Wc === 1) && (e2Wc === 0 || e2Wc === 1))
		{
			//neither edge is currently contributing ...
			var e1Wc2, e2Wc2;
			switch (e1FillType2)
			{
			case ClipperLib.PolyFillType.pftPositive:
				e1Wc2 = e1.WindCnt2;
				break;
			case ClipperLib.PolyFillType.pftNegative:
				e1Wc2 = -e1.WindCnt2;
				break;
			default:
				e1Wc2 = Math.abs(e1.WindCnt2);
				break;
			}
			switch (e2FillType2)
			{
			case ClipperLib.PolyFillType.pftPositive:
				e2Wc2 = e2.WindCnt2;
				break;
			case ClipperLib.PolyFillType.pftNegative:
				e2Wc2 = -e2.WindCnt2;
				break;
			default:
				e2Wc2 = Math.abs(e2.WindCnt2);
				break;
			}
			if (e1.PolyTyp !== e2.PolyTyp)
			{
				this.AddLocalMinPoly(e1, e2, pt);
			}
			else if (e1Wc === 1 && e2Wc === 1)
				switch (this.m_ClipType)
				{
				case ClipperLib.ClipType.ctIntersection:
					if (e1Wc2 > 0 && e2Wc2 > 0)
						this.AddLocalMinPoly(e1, e2, pt);
					break;
				case ClipperLib.ClipType.ctUnion:
					if (e1Wc2 <= 0 && e2Wc2 <= 0)
						this.AddLocalMinPoly(e1, e2, pt);
					break;
				case ClipperLib.ClipType.ctDifference:
					if (((e1.PolyTyp === ClipperLib.PolyType.ptClip) && (e1Wc2 > 0) && (e2Wc2 > 0)) ||
						((e1.PolyTyp === ClipperLib.PolyType.ptSubject) && (e1Wc2 <= 0) && (e2Wc2 <= 0)))
						this.AddLocalMinPoly(e1, e2, pt);
					break;
				case ClipperLib.ClipType.ctXor:
					this.AddLocalMinPoly(e1, e2, pt);
					break;
				}
			else
				ClipperLib.Clipper.SwapSides(e1, e2);
		}
	};

	ClipperLib.Clipper.prototype.DeleteFromSEL = function (e)
	{
		var SelPrev = e.PrevInSEL;
		var SelNext = e.NextInSEL;
		if (SelPrev === null && SelNext === null && (e !== this.m_SortedEdges))
			return;
		//already deleted
		if (SelPrev !== null)
			SelPrev.NextInSEL = SelNext;
		else
			this.m_SortedEdges = SelNext;
		if (SelNext !== null)
			SelNext.PrevInSEL = SelPrev;
		e.NextInSEL = null;
		e.PrevInSEL = null;
	};

	ClipperLib.Clipper.prototype.ProcessHorizontals = function ()
	{
		var horzEdge = {}; //m_SortedEdges;
		while (this.PopEdgeFromSEL(horzEdge))
		{
			this.ProcessHorizontal(horzEdge.v);
		}
	};

	ClipperLib.Clipper.prototype.GetHorzDirection = function (HorzEdge, $var)
	{
		if (HorzEdge.Bot.X < HorzEdge.Top.X)
		{
			$var.Left = HorzEdge.Bot.X;
			$var.Right = HorzEdge.Top.X;
			$var.Dir = ClipperLib.Direction.dLeftToRight;
		}
		else
		{
			$var.Left = HorzEdge.Top.X;
			$var.Right = HorzEdge.Bot.X;
			$var.Dir = ClipperLib.Direction.dRightToLeft;
		}
	};

	ClipperLib.Clipper.prototype.ProcessHorizontal = function (horzEdge)
	{
		var $var = {
			Dir: null,
			Left: null,
			Right: null
		};

		this.GetHorzDirection(horzEdge, $var);
		var dir = $var.Dir;
		var horzLeft = $var.Left;
		var horzRight = $var.Right;

		var IsOpen = horzEdge.WindDelta === 0;

		var eLastHorz = horzEdge,
			eMaxPair = null;
		while (eLastHorz.NextInLML !== null && ClipperLib.ClipperBase.IsHorizontal(eLastHorz.NextInLML))
			eLastHorz = eLastHorz.NextInLML;
		if (eLastHorz.NextInLML === null)
			eMaxPair = this.GetMaximaPair(eLastHorz);

		var currMax = this.m_Maxima;
		if (currMax !== null)
		{
			//get the first maxima in range (X) ...
			if (dir === ClipperLib.Direction.dLeftToRight)
			{
				while (currMax !== null && currMax.X <= horzEdge.Bot.X)
				{
					currMax = currMax.Next;
				}
				if (currMax !== null && currMax.X >= eLastHorz.Top.X)
				{
					currMax = null;
				}
			}
			else
			{
				while (currMax.Next !== null && currMax.Next.X < horzEdge.Bot.X)
				{
					currMax = currMax.Next;
				}
				if (currMax.X <= eLastHorz.Top.X)
				{
					currMax = null;
				}
			}
		}
		var op1 = null;
		for (;;) //loop through consec. horizontal edges
		{
			var IsLastHorz = (horzEdge === eLastHorz);
			var e = this.GetNextInAEL(horzEdge, dir);
			while (e !== null)
			{
				//this code block inserts extra coords into horizontal edges (in output
				//polygons) whereever maxima touch these horizontal edges. This helps
				//'simplifying' polygons (ie if the Simplify property is set).
				if (currMax !== null)
				{
					if (dir === ClipperLib.Direction.dLeftToRight)
					{
						while (currMax !== null && currMax.X < e.Curr.X)
						{
							if (horzEdge.OutIdx >= 0 && !IsOpen)
							{
								this.AddOutPt(horzEdge, new ClipperLib.IntPoint2(currMax.X, horzEdge.Bot.Y));
							}
							currMax = currMax.Next;
						}
					}
					else
					{
						while (currMax !== null && currMax.X > e.Curr.X)
						{
							if (horzEdge.OutIdx >= 0 && !IsOpen)
							{
								this.AddOutPt(horzEdge, new ClipperLib.IntPoint2(currMax.X, horzEdge.Bot.Y));
							}
							currMax = currMax.Prev;
						}
					}
				}

				if ((dir === ClipperLib.Direction.dLeftToRight && e.Curr.X > horzRight) || (dir === ClipperLib.Direction.dRightToLeft && e.Curr.X < horzLeft))
				{
					break;
				}

				//Also break if we've got to the end of an intermediate horizontal edge ...
				//nb: Smaller Dx's are to the right of larger Dx's ABOVE the horizontal.
				if (e.Curr.X === horzEdge.Top.X && horzEdge.NextInLML !== null && e.Dx < horzEdge.NextInLML.Dx)
					break;

				if (horzEdge.OutIdx >= 0 && !IsOpen) //note: may be done multiple times
				{
					if (ClipperLib.use_xyz)
					{
						if (dir === ClipperLib.Direction.dLeftToRight)
							this.SetZ(e.Curr, horzEdge, e);
						else this.SetZ(e.Curr, e, horzEdge);
					}

					op1 = this.AddOutPt(horzEdge, e.Curr);
					var eNextHorz = this.m_SortedEdges;
					while (eNextHorz !== null)
					{
						if (eNextHorz.OutIdx >= 0 && this.HorzSegmentsOverlap(horzEdge.Bot.X, horzEdge.Top.X, eNextHorz.Bot.X, eNextHorz.Top.X))
						{
							var op2 = this.GetLastOutPt(eNextHorz);
							this.AddJoin(op2, op1, eNextHorz.Top);
						}
						eNextHorz = eNextHorz.NextInSEL;
					}
					this.AddGhostJoin(op1, horzEdge.Bot);
				}

				//OK, so far we're still in range of the horizontal Edge  but make sure
				//we're at the last of consec. horizontals when matching with eMaxPair
				if (e === eMaxPair && IsLastHorz)
				{
					if (horzEdge.OutIdx >= 0)
					{
						this.AddLocalMaxPoly(horzEdge, eMaxPair, horzEdge.Top);
					}
					this.DeleteFromAEL(horzEdge);
					this.DeleteFromAEL(eMaxPair);
					return;
				}

				if (dir === ClipperLib.Direction.dLeftToRight)
				{
					var Pt = new ClipperLib.IntPoint2(e.Curr.X, horzEdge.Curr.Y);
					this.IntersectEdges(horzEdge, e, Pt);
				}
				else
				{
					var Pt = new ClipperLib.IntPoint2(e.Curr.X, horzEdge.Curr.Y);
					this.IntersectEdges(e, horzEdge, Pt);
				}
				var eNext = this.GetNextInAEL(e, dir);
				this.SwapPositionsInAEL(horzEdge, e);
				e = eNext;
			} //end while(e !== null)

			//Break out of loop if HorzEdge.NextInLML is not also horizontal ...
			if (horzEdge.NextInLML === null || !ClipperLib.ClipperBase.IsHorizontal(horzEdge.NextInLML))
			{
				break;
			}

			horzEdge = this.UpdateEdgeIntoAEL(horzEdge);
			if (horzEdge.OutIdx >= 0)
			{
				this.AddOutPt(horzEdge, horzEdge.Bot);
			}

			$var = {
				Dir: dir,
				Left: horzLeft,
				Right: horzRight
			};

			this.GetHorzDirection(horzEdge, $var);
			dir = $var.Dir;
			horzLeft = $var.Left;
			horzRight = $var.Right;

		} //end for (;;)

		if (horzEdge.OutIdx >= 0 && op1 === null)
		{
			op1 = this.GetLastOutPt(horzEdge);
			var eNextHorz = this.m_SortedEdges;
			while (eNextHorz !== null)
			{
				if (eNextHorz.OutIdx >= 0 && this.HorzSegmentsOverlap(horzEdge.Bot.X, horzEdge.Top.X, eNextHorz.Bot.X, eNextHorz.Top.X))
				{
					var op2 = this.GetLastOutPt(eNextHorz);
					this.AddJoin(op2, op1, eNextHorz.Top);
				}
				eNextHorz = eNextHorz.NextInSEL;
			}
			this.AddGhostJoin(op1, horzEdge.Top);
		}

		if (horzEdge.NextInLML !== null)
		{
			if (horzEdge.OutIdx >= 0)
			{
				op1 = this.AddOutPt(horzEdge, horzEdge.Top);

				horzEdge = this.UpdateEdgeIntoAEL(horzEdge);
				if (horzEdge.WindDelta === 0)
				{
					return;
				}
				//nb: HorzEdge is no longer horizontal here
				var ePrev = horzEdge.PrevInAEL;
				var eNext = horzEdge.NextInAEL;
				if (ePrev !== null && ePrev.Curr.X === horzEdge.Bot.X && ePrev.Curr.Y === horzEdge.Bot.Y && ePrev.WindDelta === 0 && (ePrev.OutIdx >= 0 && ePrev.Curr.Y > ePrev.Top.Y && ClipperLib.ClipperBase.SlopesEqual3(horzEdge, ePrev, this.m_UseFullRange)))
				{
					var op2 = this.AddOutPt(ePrev, horzEdge.Bot);
					this.AddJoin(op1, op2, horzEdge.Top);
				}
				else if (eNext !== null && eNext.Curr.X === horzEdge.Bot.X && eNext.Curr.Y === horzEdge.Bot.Y && eNext.WindDelta !== 0 && eNext.OutIdx >= 0 && eNext.Curr.Y > eNext.Top.Y && ClipperLib.ClipperBase.SlopesEqual3(horzEdge, eNext, this.m_UseFullRange))
				{
					var op2 = this.AddOutPt(eNext, horzEdge.Bot);
					this.AddJoin(op1, op2, horzEdge.Top);
				}
			}
			else
			{
				horzEdge = this.UpdateEdgeIntoAEL(horzEdge);
			}
		}
		else
		{
			if (horzEdge.OutIdx >= 0)
			{
				this.AddOutPt(horzEdge, horzEdge.Top);
			}
			this.DeleteFromAEL(horzEdge);
		}
	};

	ClipperLib.Clipper.prototype.GetNextInAEL = function (e, Direction)
	{
		return Direction === ClipperLib.Direction.dLeftToRight ? e.NextInAEL : e.PrevInAEL;
	};

	ClipperLib.Clipper.prototype.IsMinima = function (e)
	{
		return e !== null && (e.Prev.NextInLML !== e) && (e.Next.NextInLML !== e);
	};

	ClipperLib.Clipper.prototype.IsMaxima = function (e, Y)
	{
		return (e !== null && e.Top.Y === Y && e.NextInLML === null);
	};

	ClipperLib.Clipper.prototype.IsIntermediate = function (e, Y)
	{
		return (e.Top.Y === Y && e.NextInLML !== null);
	};

	ClipperLib.Clipper.prototype.GetMaximaPair = function (e)
	{
		if ((ClipperLib.IntPoint.op_Equality(e.Next.Top, e.Top)) && e.Next.NextInLML === null)
		{
			return e.Next;
		}
		else
		{
			if ((ClipperLib.IntPoint.op_Equality(e.Prev.Top, e.Top)) && e.Prev.NextInLML === null)
			{
				return e.Prev;
			}
			else
			{
				return null;
			}
		}
	};

	ClipperLib.Clipper.prototype.GetMaximaPairEx = function (e)
	{
		//as above but returns null if MaxPair isn't in AEL (unless it's horizontal)
		var result = this.GetMaximaPair(e);
		if (result === null || result.OutIdx === ClipperLib.ClipperBase.Skip ||
			((result.NextInAEL === result.PrevInAEL) && !ClipperLib.ClipperBase.IsHorizontal(result)))
		{
			return null;
		}
		return result;
	};

	ClipperLib.Clipper.prototype.ProcessIntersections = function (topY)
	{
		if (this.m_ActiveEdges === null)
			return true;
		try
		{
			this.BuildIntersectList(topY);
			if (this.m_IntersectList.length === 0)
				return true;
			if (this.m_IntersectList.length === 1 || this.FixupIntersectionOrder())
				this.ProcessIntersectList();
			else
				return false;
		}
		catch ($$e2)
		{
			this.m_SortedEdges = null;
			this.m_IntersectList.length = 0;
			ClipperLib.Error("ProcessIntersections error");
		}
		this.m_SortedEdges = null;
		return true;
	};

	ClipperLib.Clipper.prototype.BuildIntersectList = function (topY)
	{
		if (this.m_ActiveEdges === null)
			return;
		//prepare for sorting ...
		var e = this.m_ActiveEdges;
		//console.log(JSON.stringify(JSON.decycle( e )));
		this.m_SortedEdges = e;
		while (e !== null)
		{
			e.PrevInSEL = e.PrevInAEL;
			e.NextInSEL = e.NextInAEL;
			e.Curr.X = ClipperLib.Clipper.TopX(e, topY);
			e = e.NextInAEL;
		}
		//bubblesort ...
		var isModified = true;
		while (isModified && this.m_SortedEdges !== null)
		{
			isModified = false;
			e = this.m_SortedEdges;
			while (e.NextInSEL !== null)
			{
				var eNext = e.NextInSEL;
				var pt = new ClipperLib.IntPoint0();
				//console.log("e.Curr.X: " + e.Curr.X + " eNext.Curr.X" + eNext.Curr.X);
				if (e.Curr.X > eNext.Curr.X)
				{
					this.IntersectPoint(e, eNext, pt);
					if (pt.Y < topY)
					{
						pt = new ClipperLib.IntPoint2(ClipperLib.Clipper.TopX(e, topY), topY);
					}
					var newNode = new ClipperLib.IntersectNode();
					newNode.Edge1 = e;
					newNode.Edge2 = eNext;
					//newNode.Pt = pt;
					newNode.Pt.X = pt.X;
					newNode.Pt.Y = pt.Y;
					if (ClipperLib.use_xyz) newNode.Pt.Z = pt.Z;
					this.m_IntersectList.push(newNode);
					this.SwapPositionsInSEL(e, eNext);
					isModified = true;
				}
				else
					e = eNext;
			}
			if (e.PrevInSEL !== null)
				e.PrevInSEL.NextInSEL = null;
			else
				break;
		}
		this.m_SortedEdges = null;
	};

	ClipperLib.Clipper.prototype.EdgesAdjacent = function (inode)
	{
		return (inode.Edge1.NextInSEL === inode.Edge2) || (inode.Edge1.PrevInSEL === inode.Edge2);
	};

	ClipperLib.Clipper.IntersectNodeSort = function (node1, node2)
	{
		//the following typecast is safe because the differences in Pt.Y will
		//be limited to the height of the scanbeam.
		return (node2.Pt.Y - node1.Pt.Y);
	};

	ClipperLib.Clipper.prototype.FixupIntersectionOrder = function ()
	{
		//pre-condition: intersections are sorted bottom-most first.
		//Now it's crucial that intersections are made only between adjacent edges,
		//so to ensure this the order of intersections may need adjusting ...
		this.m_IntersectList.sort(this.m_IntersectNodeComparer);
		this.CopyAELToSEL();
		var cnt = this.m_IntersectList.length;
		for (var i = 0; i < cnt; i++)
		{
			if (!this.EdgesAdjacent(this.m_IntersectList[i]))
			{
				var j = i + 1;
				while (j < cnt && !this.EdgesAdjacent(this.m_IntersectList[j]))
					j++;
				if (j === cnt)
					return false;
				var tmp = this.m_IntersectList[i];
				this.m_IntersectList[i] = this.m_IntersectList[j];
				this.m_IntersectList[j] = tmp;
			}
			this.SwapPositionsInSEL(this.m_IntersectList[i].Edge1, this.m_IntersectList[i].Edge2);
		}
		return true;
	};

	ClipperLib.Clipper.prototype.ProcessIntersectList = function ()
	{
		for (var i = 0, ilen = this.m_IntersectList.length; i < ilen; i++)
		{
			var iNode = this.m_IntersectList[i];
			this.IntersectEdges(iNode.Edge1, iNode.Edge2, iNode.Pt);
			this.SwapPositionsInAEL(iNode.Edge1, iNode.Edge2);
		}
		this.m_IntersectList.length = 0;
	};

	/*
	--------------------------------
	Round speedtest: http://jsperf.com/fastest-round
	--------------------------------
	*/
	var R1 = function (a)
	{
		return a < 0 ? Math.ceil(a - 0.5) : Math.round(a)
	};

	var R2 = function (a)
	{
		return a < 0 ? Math.ceil(a - 0.5) : Math.floor(a + 0.5)
	};

	var R3 = function (a)
	{
		return a < 0 ? -Math.round(Math.abs(a)) : Math.round(a)
	};

	var R4 = function (a)
	{
		if (a < 0)
		{
			a -= 0.5;
			return a < -2147483648 ? Math.ceil(a) : a | 0;
		}
		else
		{
			a += 0.5;
			return a > 2147483647 ? Math.floor(a) : a | 0;
		}
	};

	if (browser.msie) ClipperLib.Clipper.Round = R1;
	else if (browser.chromium) ClipperLib.Clipper.Round = R3;
	else if (browser.safari) ClipperLib.Clipper.Round = R4;
	else ClipperLib.Clipper.Round = R2; // eg. browser.chrome || browser.firefox || browser.opera
	ClipperLib.Clipper.TopX = function (edge, currentY)
	{
		//if (edge.Bot == edge.Curr) alert ("edge.Bot = edge.Curr");
		//if (edge.Bot == edge.Top) alert ("edge.Bot = edge.Top");
		if (currentY === edge.Top.Y)
			return edge.Top.X;
		return edge.Bot.X + ClipperLib.Clipper.Round(edge.Dx * (currentY - edge.Bot.Y));
	};

	ClipperLib.Clipper.prototype.IntersectPoint = function (edge1, edge2, ip)
	{
		ip.X = 0;
		ip.Y = 0;
		var b1, b2;
		//nb: with very large coordinate values, it's possible for SlopesEqual() to
		//return false but for the edge.Dx value be equal due to double precision rounding.
		if (edge1.Dx === edge2.Dx)
		{
			ip.Y = edge1.Curr.Y;
			ip.X = ClipperLib.Clipper.TopX(edge1, ip.Y);
			return;
		}
		if (edge1.Delta.X === 0)
		{
			ip.X = edge1.Bot.X;
			if (ClipperLib.ClipperBase.IsHorizontal(edge2))
			{
				ip.Y = edge2.Bot.Y;
			}
			else
			{
				b2 = edge2.Bot.Y - (edge2.Bot.X / edge2.Dx);
				ip.Y = ClipperLib.Clipper.Round(ip.X / edge2.Dx + b2);
			}
		}
		else if (edge2.Delta.X === 0)
		{
			ip.X = edge2.Bot.X;
			if (ClipperLib.ClipperBase.IsHorizontal(edge1))
			{
				ip.Y = edge1.Bot.Y;
			}
			else
			{
				b1 = edge1.Bot.Y - (edge1.Bot.X / edge1.Dx);
				ip.Y = ClipperLib.Clipper.Round(ip.X / edge1.Dx + b1);
			}
		}
		else
		{
			b1 = edge1.Bot.X - edge1.Bot.Y * edge1.Dx;
			b2 = edge2.Bot.X - edge2.Bot.Y * edge2.Dx;
			var q = (b2 - b1) / (edge1.Dx - edge2.Dx);
			ip.Y = ClipperLib.Clipper.Round(q);
			if (Math.abs(edge1.Dx) < Math.abs(edge2.Dx))
				ip.X = ClipperLib.Clipper.Round(edge1.Dx * q + b1);
			else
				ip.X = ClipperLib.Clipper.Round(edge2.Dx * q + b2);
		}
		if (ip.Y < edge1.Top.Y || ip.Y < edge2.Top.Y)
		{
			if (edge1.Top.Y > edge2.Top.Y)
			{
				ip.Y = edge1.Top.Y;
				ip.X = ClipperLib.Clipper.TopX(edge2, edge1.Top.Y);
				return ip.X < edge1.Top.X;
			}
			else
				ip.Y = edge2.Top.Y;
			if (Math.abs(edge1.Dx) < Math.abs(edge2.Dx))
				ip.X = ClipperLib.Clipper.TopX(edge1, ip.Y);
			else
				ip.X = ClipperLib.Clipper.TopX(edge2, ip.Y);
		}
		//finally, don't allow 'ip' to be BELOW curr.Y (ie bottom of scanbeam) ...
		if (ip.Y > edge1.Curr.Y)
		{
			ip.Y = edge1.Curr.Y;
			//better to use the more vertical edge to derive X ...
			if (Math.abs(edge1.Dx) > Math.abs(edge2.Dx))
				ip.X = ClipperLib.Clipper.TopX(edge2, ip.Y);
			else
				ip.X = ClipperLib.Clipper.TopX(edge1, ip.Y);
		}
	};

	ClipperLib.Clipper.prototype.ProcessEdgesAtTopOfScanbeam = function (topY)
	{
		var e = this.m_ActiveEdges;

		while (e !== null)
		{
			//1. process maxima, treating them as if they're 'bent' horizontal edges,
			//   but exclude maxima with horizontal edges. nb: e can't be a horizontal.
			var IsMaximaEdge = this.IsMaxima(e, topY);
			if (IsMaximaEdge)
			{
				var eMaxPair = this.GetMaximaPairEx(e);
				IsMaximaEdge = (eMaxPair === null || !ClipperLib.ClipperBase.IsHorizontal(eMaxPair));
			}
			if (IsMaximaEdge)
			{
				if (this.StrictlySimple)
				{
					this.InsertMaxima(e.Top.X);
				}
				var ePrev = e.PrevInAEL;
				this.DoMaxima(e);
				if (ePrev === null)
					e = this.m_ActiveEdges;
				else
					e = ePrev.NextInAEL;
			}
			else
			{
				//2. promote horizontal edges, otherwise update Curr.X and Curr.Y ...
				if (this.IsIntermediate(e, topY) && ClipperLib.ClipperBase.IsHorizontal(e.NextInLML))
				{
					e = this.UpdateEdgeIntoAEL(e);
					if (e.OutIdx >= 0)
						this.AddOutPt(e, e.Bot);
					this.AddEdgeToSEL(e);
				}
				else
				{
					e.Curr.X = ClipperLib.Clipper.TopX(e, topY);
					e.Curr.Y = topY;
				}

				if (ClipperLib.use_xyz)
				{
					if (e.Top.Y === topY) e.Curr.Z = e.Top.Z;
					else if (e.Bot.Y === topY) e.Curr.Z = e.Bot.Z;
					else e.Curr.Z = 0;
				}

				//When StrictlySimple and 'e' is being touched by another edge, then
				//make sure both edges have a vertex here ...
				if (this.StrictlySimple)
				{
					var ePrev = e.PrevInAEL;
					if ((e.OutIdx >= 0) && (e.WindDelta !== 0) && ePrev !== null &&
						(ePrev.OutIdx >= 0) && (ePrev.Curr.X === e.Curr.X) &&
						(ePrev.WindDelta !== 0))
					{
						var ip = new ClipperLib.IntPoint1(e.Curr);

						if (ClipperLib.use_xyz)
						{
							this.SetZ(ip, ePrev, e);
						}

						var op = this.AddOutPt(ePrev, ip);
						var op2 = this.AddOutPt(e, ip);
						this.AddJoin(op, op2, ip); //StrictlySimple (type-3) join
					}
				}
				e = e.NextInAEL;
			}
		}
		//3. Process horizontals at the Top of the scanbeam ...
		this.ProcessHorizontals();
		this.m_Maxima = null;
		//4. Promote intermediate vertices ...
		e = this.m_ActiveEdges;
		while (e !== null)
		{
			if (this.IsIntermediate(e, topY))
			{
				var op = null;
				if (e.OutIdx >= 0)
					op = this.AddOutPt(e, e.Top);
				e = this.UpdateEdgeIntoAEL(e);
				//if output polygons share an edge, they'll need joining later ...
				var ePrev = e.PrevInAEL;
				var eNext = e.NextInAEL;

				if (ePrev !== null && ePrev.Curr.X === e.Bot.X && ePrev.Curr.Y === e.Bot.Y && op !== null && ePrev.OutIdx >= 0 && ePrev.Curr.Y === ePrev.Top.Y && ClipperLib.ClipperBase.SlopesEqual5(e.Curr, e.Top, ePrev.Curr, ePrev.Top, this.m_UseFullRange) && (e.WindDelta !== 0) && (ePrev.WindDelta !== 0))
				{
					var op2 = this.AddOutPt(ePrev2, e.Bot);
					this.AddJoin(op, op2, e.Top);
				}
				else if (eNext !== null && eNext.Curr.X === e.Bot.X && eNext.Curr.Y === e.Bot.Y && op !== null && eNext.OutIdx >= 0 && eNext.Curr.Y === eNext.Top.Y && ClipperLib.ClipperBase.SlopesEqual5(e.Curr, e.Top, eNext.Curr, eNext.Top, this.m_UseFullRange) && (e.WindDelta !== 0) && (eNext.WindDelta !== 0))
				{
					var op2 = this.AddOutPt(eNext, e.Bot);
					this.AddJoin(op, op2, e.Top);
				}
			}
			e = e.NextInAEL;
		}
	};

	ClipperLib.Clipper.prototype.DoMaxima = function (e)
	{
		var eMaxPair = this.GetMaximaPairEx(e);
		if (eMaxPair === null)
		{
			if (e.OutIdx >= 0)
				this.AddOutPt(e, e.Top);
			this.DeleteFromAEL(e);
			return;
		}
		var eNext = e.NextInAEL;
		while (eNext !== null && eNext !== eMaxPair)
		{
			this.IntersectEdges(e, eNext, e.Top);
			this.SwapPositionsInAEL(e, eNext);
			eNext = e.NextInAEL;
		}
		if (e.OutIdx === -1 && eMaxPair.OutIdx === -1)
		{
			this.DeleteFromAEL(e);
			this.DeleteFromAEL(eMaxPair);
		}
		else if (e.OutIdx >= 0 && eMaxPair.OutIdx >= 0)
		{
			if (e.OutIdx >= 0) this.AddLocalMaxPoly(e, eMaxPair, e.Top);
			this.DeleteFromAEL(e);
			this.DeleteFromAEL(eMaxPair);
		}
		else if (ClipperLib.use_lines && e.WindDelta === 0)
		{
			if (e.OutIdx >= 0)
			{
				this.AddOutPt(e, e.Top);
				e.OutIdx = ClipperLib.ClipperBase.Unassigned;
			}
			this.DeleteFromAEL(e);
			if (eMaxPair.OutIdx >= 0)
			{
				this.AddOutPt(eMaxPair, e.Top);
				eMaxPair.OutIdx = ClipperLib.ClipperBase.Unassigned;
			}
			this.DeleteFromAEL(eMaxPair);
		}
		else
			ClipperLib.Error("DoMaxima error");
	};

	ClipperLib.Clipper.ReversePaths = function (polys)
	{
		for (var i = 0, len = polys.length; i < len; i++)
			polys[i].reverse();
	};

	ClipperLib.Clipper.Orientation = function (poly)
	{
		return ClipperLib.Clipper.Area(poly) >= 0;
	};

	ClipperLib.Clipper.prototype.PointCount = function (pts)
	{
		if (pts === null)
			return 0;
		var result = 0;
		var p = pts;
		do {
			result++;
			p = p.Next;
		}
		while (p !== pts)
		return result;
	};

	ClipperLib.Clipper.prototype.BuildResult = function (polyg)
	{
		ClipperLib.Clear(polyg);
		for (var i = 0, ilen = this.m_PolyOuts.length; i < ilen; i++)
		{
			var outRec = this.m_PolyOuts[i];
			if (outRec.Pts === null)
				continue;
			var p = outRec.Pts.Prev;
			var cnt = this.PointCount(p);
			if (cnt < 2)
				continue;
			var pg = new Array(cnt);
			for (var j = 0; j < cnt; j++)
			{
				pg[j] = p.Pt;
				p = p.Prev;
			}
			polyg.push(pg);
		}
	};

	ClipperLib.Clipper.prototype.BuildResult2 = function (polytree)
	{
		polytree.Clear();
		//add each output polygon/contour to polytree ...
		//polytree.m_AllPolys.set_Capacity(this.m_PolyOuts.length);
		for (var i = 0, ilen = this.m_PolyOuts.length; i < ilen; i++)
		{
			var outRec = this.m_PolyOuts[i];
			var cnt = this.PointCount(outRec.Pts);
			if ((outRec.IsOpen && cnt < 2) || (!outRec.IsOpen && cnt < 3))
				continue;
			this.FixHoleLinkage(outRec);
			var pn = new ClipperLib.PolyNode();
			polytree.m_AllPolys.push(pn);
			outRec.PolyNode = pn;
			pn.m_polygon.length = cnt;
			var op = outRec.Pts.Prev;
			for (var j = 0; j < cnt; j++)
			{
				pn.m_polygon[j] = op.Pt;
				op = op.Prev;
			}
		}
		//fixup PolyNode links etc ...
		//polytree.m_Childs.set_Capacity(this.m_PolyOuts.length);
		for (var i = 0, ilen = this.m_PolyOuts.length; i < ilen; i++)
		{
			var outRec = this.m_PolyOuts[i];
			if (outRec.PolyNode === null)
				continue;
			else if (outRec.IsOpen)
			{
				outRec.PolyNode.IsOpen = true;
				polytree.AddChild(outRec.PolyNode);
			}
			else if (outRec.FirstLeft !== null && outRec.FirstLeft.PolyNode !== null)
				outRec.FirstLeft.PolyNode.AddChild(outRec.PolyNode);
			else
				polytree.AddChild(outRec.PolyNode);
		}
	};

	ClipperLib.Clipper.prototype.FixupOutPolyline = function (outRec)
	{
		var pp = outRec.Pts;
		var lastPP = pp.Prev;
		while (pp !== lastPP)
		{
			pp = pp.Next;
			if (ClipperLib.IntPoint.op_Equality(pp.Pt, pp.Prev.Pt))
			{
				if (pp === lastPP)
				{
					lastPP = pp.Prev;
				}
				var tmpPP = pp.Prev;
				tmpPP.Next = pp.Next;
				pp.Next.Prev = tmpPP;
				pp = tmpPP;
			}
		}
		if (pp === pp.Prev)
		{
			outRec.Pts = null;
		}
	};

	ClipperLib.Clipper.prototype.FixupOutPolygon = function (outRec)
	{
		//FixupOutPolygon() - removes duplicate points and simplifies consecutive
		//parallel edges by removing the middle vertex.
		var lastOK = null;
		outRec.BottomPt = null;
		var pp = outRec.Pts;
		var preserveCol = this.PreserveCollinear || this.StrictlySimple;
		for (;;)
		{
			if (pp.Prev === pp || pp.Prev === pp.Next)
			{
				outRec.Pts = null;
				return;
			}

			//test for duplicate points and collinear edges ...
			if ((ClipperLib.IntPoint.op_Equality(pp.Pt, pp.Next.Pt)) || (ClipperLib.IntPoint.op_Equality(pp.Pt, pp.Prev.Pt)) || (ClipperLib.ClipperBase.SlopesEqual4(pp.Prev.Pt, pp.Pt, pp.Next.Pt, this.m_UseFullRange) && (!preserveCol || !this.Pt2IsBetweenPt1AndPt3(pp.Prev.Pt, pp.Pt, pp.Next.Pt))))
			{
				lastOK = null;
				pp.Prev.Next = pp.Next;
				pp.Next.Prev = pp.Prev;
				pp = pp.Prev;
			}
			else if (pp === lastOK)
				break;
			else
			{
				if (lastOK === null)
					lastOK = pp;
				pp = pp.Next;
			}
		}
		outRec.Pts = pp;
	};

	ClipperLib.Clipper.prototype.DupOutPt = function (outPt, InsertAfter)
	{
		var result = new ClipperLib.OutPt();
		//result.Pt = outPt.Pt;
		result.Pt.X = outPt.Pt.X;
		result.Pt.Y = outPt.Pt.Y;
		if (ClipperLib.use_xyz) result.Pt.Z = outPt.Pt.Z;
		result.Idx = outPt.Idx;
		if (InsertAfter)
		{
			result.Next = outPt.Next;
			result.Prev = outPt;
			outPt.Next.Prev = result;
			outPt.Next = result;
		}
		else
		{
			result.Prev = outPt.Prev;
			result.Next = outPt;
			outPt.Prev.Next = result;
			outPt.Prev = result;
		}
		return result;
	};

	ClipperLib.Clipper.prototype.GetOverlap = function (a1, a2, b1, b2, $val)
	{
		if (a1 < a2)
		{
			if (b1 < b2)
			{
				$val.Left = Math.max(a1, b1);
				$val.Right = Math.min(a2, b2);
			}
			else
			{
				$val.Left = Math.max(a1, b2);
				$val.Right = Math.min(a2, b1);
			}
		}
		else
		{
			if (b1 < b2)
			{
				$val.Left = Math.max(a2, b1);
				$val.Right = Math.min(a1, b2);
			}
			else
			{
				$val.Left = Math.max(a2, b2);
				$val.Right = Math.min(a1, b1);
			}
		}
		return $val.Left < $val.Right;
	};

	ClipperLib.Clipper.prototype.JoinHorz = function (op1, op1b, op2, op2b, Pt, DiscardLeft)
	{
		var Dir1 = (op1.Pt.X > op1b.Pt.X ? ClipperLib.Direction.dRightToLeft : ClipperLib.Direction.dLeftToRight);
		var Dir2 = (op2.Pt.X > op2b.Pt.X ? ClipperLib.Direction.dRightToLeft : ClipperLib.Direction.dLeftToRight);
		if (Dir1 === Dir2)
			return false;
		//When DiscardLeft, we want Op1b to be on the Left of Op1, otherwise we
		//want Op1b to be on the Right. (And likewise with Op2 and Op2b.)
		//So, to facilitate this while inserting Op1b and Op2b ...
		//when DiscardLeft, make sure we're AT or RIGHT of Pt before adding Op1b,
		//otherwise make sure we're AT or LEFT of Pt. (Likewise with Op2b.)
		if (Dir1 === ClipperLib.Direction.dLeftToRight)
		{
			while (op1.Next.Pt.X <= Pt.X &&
				op1.Next.Pt.X >= op1.Pt.X && op1.Next.Pt.Y === Pt.Y)
				op1 = op1.Next;
			if (DiscardLeft && (op1.Pt.X !== Pt.X))
				op1 = op1.Next;
			op1b = this.DupOutPt(op1, !DiscardLeft);
			if (ClipperLib.IntPoint.op_Inequality(op1b.Pt, Pt))
			{
				op1 = op1b;
				//op1.Pt = Pt;
				op1.Pt.X = Pt.X;
				op1.Pt.Y = Pt.Y;
				if (ClipperLib.use_xyz) op1.Pt.Z = Pt.Z;
				op1b = this.DupOutPt(op1, !DiscardLeft);
			}
		}
		else
		{
			while (op1.Next.Pt.X >= Pt.X &&
				op1.Next.Pt.X <= op1.Pt.X && op1.Next.Pt.Y === Pt.Y)
				op1 = op1.Next;
			if (!DiscardLeft && (op1.Pt.X !== Pt.X))
				op1 = op1.Next;
			op1b = this.DupOutPt(op1, DiscardLeft);
			if (ClipperLib.IntPoint.op_Inequality(op1b.Pt, Pt))
			{
				op1 = op1b;
				//op1.Pt = Pt;
				op1.Pt.X = Pt.X;
				op1.Pt.Y = Pt.Y;
				if (ClipperLib.use_xyz) op1.Pt.Z = Pt.Z;
				op1b = this.DupOutPt(op1, DiscardLeft);
			}
		}
		if (Dir2 === ClipperLib.Direction.dLeftToRight)
		{
			while (op2.Next.Pt.X <= Pt.X &&
				op2.Next.Pt.X >= op2.Pt.X && op2.Next.Pt.Y === Pt.Y)
				op2 = op2.Next;
			if (DiscardLeft && (op2.Pt.X !== Pt.X))
				op2 = op2.Next;
			op2b = this.DupOutPt(op2, !DiscardLeft);
			if (ClipperLib.IntPoint.op_Inequality(op2b.Pt, Pt))
			{
				op2 = op2b;
				//op2.Pt = Pt;
				op2.Pt.X = Pt.X;
				op2.Pt.Y = Pt.Y;
				if (ClipperLib.use_xyz) op2.Pt.Z = Pt.Z;
				op2b = this.DupOutPt(op2, !DiscardLeft);
			}
		}
		else
		{
			while (op2.Next.Pt.X >= Pt.X &&
				op2.Next.Pt.X <= op2.Pt.X && op2.Next.Pt.Y === Pt.Y)
				op2 = op2.Next;
			if (!DiscardLeft && (op2.Pt.X !== Pt.X))
				op2 = op2.Next;
			op2b = this.DupOutPt(op2, DiscardLeft);
			if (ClipperLib.IntPoint.op_Inequality(op2b.Pt, Pt))
			{
				op2 = op2b;
				//op2.Pt = Pt;
				op2.Pt.X = Pt.X;
				op2.Pt.Y = Pt.Y;
				if (ClipperLib.use_xyz) op2.Pt.Z = Pt.Z;
				op2b = this.DupOutPt(op2, DiscardLeft);
			}
		}
		if ((Dir1 === ClipperLib.Direction.dLeftToRight) === DiscardLeft)
		{
			op1.Prev = op2;
			op2.Next = op1;
			op1b.Next = op2b;
			op2b.Prev = op1b;
		}
		else
		{
			op1.Next = op2;
			op2.Prev = op1;
			op1b.Prev = op2b;
			op2b.Next = op1b;
		}
		return true;
	};

	ClipperLib.Clipper.prototype.JoinPoints = function (j, outRec1, outRec2)
	{
		var op1 = j.OutPt1,
			op1b = new ClipperLib.OutPt();
		var op2 = j.OutPt2,
			op2b = new ClipperLib.OutPt();
		//There are 3 kinds of joins for output polygons ...
		//1. Horizontal joins where Join.OutPt1 & Join.OutPt2 are vertices anywhere
		//along (horizontal) collinear edges (& Join.OffPt is on the same horizontal).
		//2. Non-horizontal joins where Join.OutPt1 & Join.OutPt2 are at the same
		//location at the Bottom of the overlapping segment (& Join.OffPt is above).
		//3. StrictlySimple joins where edges touch but are not collinear and where
		//Join.OutPt1, Join.OutPt2 & Join.OffPt all share the same point.
		var isHorizontal = (j.OutPt1.Pt.Y === j.OffPt.Y);
		if (isHorizontal && (ClipperLib.IntPoint.op_Equality(j.OffPt, j.OutPt1.Pt)) && (ClipperLib.IntPoint.op_Equality(j.OffPt, j.OutPt2.Pt)))
		{
			//Strictly Simple join ...
			if (outRec1 !== outRec2) return false;

			op1b = j.OutPt1.Next;
			while (op1b !== op1 && (ClipperLib.IntPoint.op_Equality(op1b.Pt, j.OffPt)))
				op1b = op1b.Next;
			var reverse1 = (op1b.Pt.Y > j.OffPt.Y);
			op2b = j.OutPt2.Next;
			while (op2b !== op2 && (ClipperLib.IntPoint.op_Equality(op2b.Pt, j.OffPt)))
				op2b = op2b.Next;
			var reverse2 = (op2b.Pt.Y > j.OffPt.Y);
			if (reverse1 === reverse2)
				return false;
			if (reverse1)
			{
				op1b = this.DupOutPt(op1, false);
				op2b = this.DupOutPt(op2, true);
				op1.Prev = op2;
				op2.Next = op1;
				op1b.Next = op2b;
				op2b.Prev = op1b;
				j.OutPt1 = op1;
				j.OutPt2 = op1b;
				return true;
			}
			else
			{
				op1b = this.DupOutPt(op1, true);
				op2b = this.DupOutPt(op2, false);
				op1.Next = op2;
				op2.Prev = op1;
				op1b.Prev = op2b;
				op2b.Next = op1b;
				j.OutPt1 = op1;
				j.OutPt2 = op1b;
				return true;
			}
		}
		else if (isHorizontal)
		{
			//treat horizontal joins differently to non-horizontal joins since with
			//them we're not yet sure where the overlapping is. OutPt1.Pt & OutPt2.Pt
			//may be anywhere along the horizontal edge.
			op1b = op1;
			while (op1.Prev.Pt.Y === op1.Pt.Y && op1.Prev !== op1b && op1.Prev !== op2)
				op1 = op1.Prev;
			while (op1b.Next.Pt.Y === op1b.Pt.Y && op1b.Next !== op1 && op1b.Next !== op2)
				op1b = op1b.Next;
			if (op1b.Next === op1 || op1b.Next === op2)
				return false;
			//a flat 'polygon'
			op2b = op2;
			while (op2.Prev.Pt.Y === op2.Pt.Y && op2.Prev !== op2b && op2.Prev !== op1b)
				op2 = op2.Prev;
			while (op2b.Next.Pt.Y === op2b.Pt.Y && op2b.Next !== op2 && op2b.Next !== op1)
				op2b = op2b.Next;
			if (op2b.Next === op2 || op2b.Next === op1)
				return false;
			//a flat 'polygon'
			//Op1 -. Op1b & Op2 -. Op2b are the extremites of the horizontal edges

			var $val = {
				Left: null,
				Right: null
			};

			if (!this.GetOverlap(op1.Pt.X, op1b.Pt.X, op2.Pt.X, op2b.Pt.X, $val))
				return false;
			var Left = $val.Left;
			var Right = $val.Right;

			//DiscardLeftSide: when overlapping edges are joined, a spike will created
			//which needs to be cleaned up. However, we don't want Op1 or Op2 caught up
			//on the discard Side as either may still be needed for other joins ...
			var Pt = new ClipperLib.IntPoint0();
			var DiscardLeftSide;
			if (op1.Pt.X >= Left && op1.Pt.X <= Right)
			{
				//Pt = op1.Pt;
				Pt.X = op1.Pt.X;
				Pt.Y = op1.Pt.Y;
				if (ClipperLib.use_xyz) Pt.Z = op1.Pt.Z;
				DiscardLeftSide = (op1.Pt.X > op1b.Pt.X);
			}
			else if (op2.Pt.X >= Left && op2.Pt.X <= Right)
			{
				//Pt = op2.Pt;
				Pt.X = op2.Pt.X;
				Pt.Y = op2.Pt.Y;
				if (ClipperLib.use_xyz) Pt.Z = op2.Pt.Z;
				DiscardLeftSide = (op2.Pt.X > op2b.Pt.X);
			}
			else if (op1b.Pt.X >= Left && op1b.Pt.X <= Right)
			{
				//Pt = op1b.Pt;
				Pt.X = op1b.Pt.X;
				Pt.Y = op1b.Pt.Y;
				if (ClipperLib.use_xyz) Pt.Z = op1b.Pt.Z;
				DiscardLeftSide = op1b.Pt.X > op1.Pt.X;
			}
			else
			{
				//Pt = op2b.Pt;
				Pt.X = op2b.Pt.X;
				Pt.Y = op2b.Pt.Y;
				if (ClipperLib.use_xyz) Pt.Z = op2b.Pt.Z;
				DiscardLeftSide = (op2b.Pt.X > op2.Pt.X);
			}
			j.OutPt1 = op1;
			j.OutPt2 = op2;
			return this.JoinHorz(op1, op1b, op2, op2b, Pt, DiscardLeftSide);
		}
		else
		{
			//nb: For non-horizontal joins ...
			//    1. Jr.OutPt1.Pt.Y == Jr.OutPt2.Pt.Y
			//    2. Jr.OutPt1.Pt > Jr.OffPt.Y
			//make sure the polygons are correctly oriented ...
			op1b = op1.Next;
			while ((ClipperLib.IntPoint.op_Equality(op1b.Pt, op1.Pt)) && (op1b !== op1))
				op1b = op1b.Next;
			var Reverse1 = ((op1b.Pt.Y > op1.Pt.Y) || !ClipperLib.ClipperBase.SlopesEqual4(op1.Pt, op1b.Pt, j.OffPt, this.m_UseFullRange));
			if (Reverse1)
			{
				op1b = op1.Prev;
				while ((ClipperLib.IntPoint.op_Equality(op1b.Pt, op1.Pt)) && (op1b !== op1))
					op1b = op1b.Prev;

				if ((op1b.Pt.Y > op1.Pt.Y) || !ClipperLib.ClipperBase.SlopesEqual4(op1.Pt, op1b.Pt, j.OffPt, this.m_UseFullRange))
					return false;
			}
			op2b = op2.Next;
			while ((ClipperLib.IntPoint.op_Equality(op2b.Pt, op2.Pt)) && (op2b !== op2))
				op2b = op2b.Next;

			var Reverse2 = ((op2b.Pt.Y > op2.Pt.Y) || !ClipperLib.ClipperBase.SlopesEqual4(op2.Pt, op2b.Pt, j.OffPt, this.m_UseFullRange));
			if (Reverse2)
			{
				op2b = op2.Prev;
				while ((ClipperLib.IntPoint.op_Equality(op2b.Pt, op2.Pt)) && (op2b !== op2))
					op2b = op2b.Prev;

				if ((op2b.Pt.Y > op2.Pt.Y) || !ClipperLib.ClipperBase.SlopesEqual4(op2.Pt, op2b.Pt, j.OffPt, this.m_UseFullRange))
					return false;
			}
			if ((op1b === op1) || (op2b === op2) || (op1b === op2b) ||
				((outRec1 === outRec2) && (Reverse1 === Reverse2)))
				return false;
			if (Reverse1)
			{
				op1b = this.DupOutPt(op1, false);
				op2b = this.DupOutPt(op2, true);
				op1.Prev = op2;
				op2.Next = op1;
				op1b.Next = op2b;
				op2b.Prev = op1b;
				j.OutPt1 = op1;
				j.OutPt2 = op1b;
				return true;
			}
			else
			{
				op1b = this.DupOutPt(op1, true);
				op2b = this.DupOutPt(op2, false);
				op1.Next = op2;
				op2.Prev = op1;
				op1b.Prev = op2b;
				op2b.Next = op1b;
				j.OutPt1 = op1;
				j.OutPt2 = op1b;
				return true;
			}
		}
	};

	ClipperLib.Clipper.GetBounds = function (paths)
	{
		var i = 0,
			cnt = paths.length;
		while (i < cnt && paths[i].length === 0) i++;
		if (i === cnt) return new ClipperLib.IntRect(0, 0, 0, 0);
		var result = new ClipperLib.IntRect();
		result.left = paths[i][0].X;
		result.right = result.left;
		result.top = paths[i][0].Y;
		result.bottom = result.top;
		for (; i < cnt; i++)
			for (var j = 0, jlen = paths[i].length; j < jlen; j++)
			{
				if (paths[i][j].X < result.left) result.left = paths[i][j].X;
				else if (paths[i][j].X > result.right) result.right = paths[i][j].X;
				if (paths[i][j].Y < result.top) result.top = paths[i][j].Y;
				else if (paths[i][j].Y > result.bottom) result.bottom = paths[i][j].Y;
			}
		return result;
	};
	ClipperLib.Clipper.prototype.GetBounds2 = function (ops)
	{
		var opStart = ops;
		var result = new ClipperLib.IntRect();
		result.left = ops.Pt.X;
		result.right = ops.Pt.X;
		result.top = ops.Pt.Y;
		result.bottom = ops.Pt.Y;
		ops = ops.Next;
		while (ops !== opStart)
		{
			if (ops.Pt.X < result.left)
				result.left = ops.Pt.X;
			if (ops.Pt.X > result.right)
				result.right = ops.Pt.X;
			if (ops.Pt.Y < result.top)
				result.top = ops.Pt.Y;
			if (ops.Pt.Y > result.bottom)
				result.bottom = ops.Pt.Y;
			ops = ops.Next;
		}
		return result;
	};

	ClipperLib.Clipper.PointInPolygon = function (pt, path)
	{
		//returns 0 if false, +1 if true, -1 if pt ON polygon boundary
		//See "The Point in Polygon Problem for Arbitrary Polygons" by Hormann & Agathos
		//http://citeseerx.ist.psu.edu/viewdoc/download?doi=10.1.1.88.5498&rep=rep1&type=pdf
		var result = 0,
			cnt = path.length;
		if (cnt < 3)
			return 0;
		var ip = path[0];
		for (var i = 1; i <= cnt; ++i)
		{
			var ipNext = (i === cnt ? path[0] : path[i]);
			if (ipNext.Y === pt.Y)
			{
				if ((ipNext.X === pt.X) || (ip.Y === pt.Y && ((ipNext.X > pt.X) === (ip.X < pt.X))))
					return -1;
			}
			if ((ip.Y < pt.Y) !== (ipNext.Y < pt.Y))
			{
				if (ip.X >= pt.X)
				{
					if (ipNext.X > pt.X)
						result = 1 - result;
					else
					{
						var d = (ip.X - pt.X) * (ipNext.Y - pt.Y) - (ipNext.X - pt.X) * (ip.Y - pt.Y);
						if (d === 0)
							return -1;
						else if ((d > 0) === (ipNext.Y > ip.Y))
							result = 1 - result;
					}
				}
				else
				{
					if (ipNext.X > pt.X)
					{
						var d = (ip.X - pt.X) * (ipNext.Y - pt.Y) - (ipNext.X - pt.X) * (ip.Y - pt.Y);
						if (d === 0)
							return -1;
						else if ((d > 0) === (ipNext.Y > ip.Y))
							result = 1 - result;
					}
				}
			}
			ip = ipNext;
		}
		return result;
	};

	ClipperLib.Clipper.prototype.PointInPolygon = function (pt, op)
	{
		//returns 0 if false, +1 if true, -1 if pt ON polygon boundary
		var result = 0;
		var startOp = op;
		var ptx = pt.X,
			pty = pt.Y;
		var poly0x = op.Pt.X,
			poly0y = op.Pt.Y;
		do {
			op = op.Next;
			var poly1x = op.Pt.X,
				poly1y = op.Pt.Y;
			if (poly1y === pty)
			{
				if ((poly1x === ptx) || (poly0y === pty && ((poly1x > ptx) === (poly0x < ptx))))
					return -1;
			}
			if ((poly0y < pty) !== (poly1y < pty))
			{
				if (poly0x >= ptx)
				{
					if (poly1x > ptx)
						result = 1 - result;
					else
					{
						var d = (poly0x - ptx) * (poly1y - pty) - (poly1x - ptx) * (poly0y - pty);
						if (d === 0)
							return -1;
						if ((d > 0) === (poly1y > poly0y))
							result = 1 - result;
					}
				}
				else
				{
					if (poly1x > ptx)
					{
						var d = (poly0x - ptx) * (poly1y - pty) - (poly1x - ptx) * (poly0y - pty);
						if (d === 0)
							return -1;
						if ((d > 0) === (poly1y > poly0y))
							result = 1 - result;
					}
				}
			}
			poly0x = poly1x;
			poly0y = poly1y;
		} while (startOp !== op);

		return result;
	};

	ClipperLib.Clipper.prototype.Poly2ContainsPoly1 = function (outPt1, outPt2)
	{
		var op = outPt1;
		do {
			//nb: PointInPolygon returns 0 if false, +1 if true, -1 if pt on polygon
			var res = this.PointInPolygon(op.Pt, outPt2);
			if (res >= 0)
				return res > 0;
			op = op.Next;
		}
		while (op !== outPt1)
		return true;
	};

	ClipperLib.Clipper.prototype.FixupFirstLefts1 = function (OldOutRec, NewOutRec)
	{
		var outRec, firstLeft;
		for (var i = 0, ilen = this.m_PolyOuts.length; i < ilen; i++)
		{
			outRec = this.m_PolyOuts[i];
			firstLeft = ClipperLib.Clipper.ParseFirstLeft(outRec.FirstLeft);
			if (outRec.Pts !== null && firstLeft === OldOutRec)
			{
				if (this.Poly2ContainsPoly1(outRec.Pts, NewOutRec.Pts))
					outRec.FirstLeft = NewOutRec;
			}
		}
	};

	ClipperLib.Clipper.prototype.FixupFirstLefts2 = function (innerOutRec, outerOutRec)
	{
		//A polygon has split into two such that one is now the inner of the other.
		//It's possible that these polygons now wrap around other polygons, so check
		//every polygon that's also contained by OuterOutRec's FirstLeft container
		//(including nil) to see if they've become inner to the new inner polygon ...
		var orfl = outerOutRec.FirstLeft;
		var outRec, firstLeft;
		for (var i = 0, ilen = this.m_PolyOuts.length; i < ilen; i++)
		{
			outRec = this.m_PolyOuts[i];
			if (outRec.Pts === null || outRec === outerOutRec || outRec === innerOutRec)
				continue;
			firstLeft = ClipperLib.Clipper.ParseFirstLeft(outRec.FirstLeft);
			if (firstLeft !== orfl && firstLeft !== innerOutRec && firstLeft !== outerOutRec)
				continue;
			if (this.Poly2ContainsPoly1(outRec.Pts, innerOutRec.Pts))
				outRec.FirstLeft = innerOutRec;
			else if (this.Poly2ContainsPoly1(outRec.Pts, outerOutRec.Pts))
				outRec.FirstLeft = outerOutRec;
			else if (outRec.FirstLeft === innerOutRec || outRec.FirstLeft === outerOutRec)
				outRec.FirstLeft = orfl;
		}
	};

	ClipperLib.Clipper.prototype.FixupFirstLefts3 = function (OldOutRec, NewOutRec)
	{
		//same as FixupFirstLefts1 but doesn't call Poly2ContainsPoly1()
		var outRec;
		var firstLeft;
		for (var i = 0, ilen = this.m_PolyOuts.length; i < ilen; i++)
		{
			outRec = this.m_PolyOuts[i];
			firstLeft = ClipperLib.Clipper.ParseFirstLeft(outRec.FirstLeft);
			if (outRec.Pts !== null && firstLeft === OldOutRec)
				outRec.FirstLeft = NewOutRec;
		}
	};

	ClipperLib.Clipper.ParseFirstLeft = function (FirstLeft)
	{
		while (FirstLeft !== null && FirstLeft.Pts === null)
			FirstLeft = FirstLeft.FirstLeft;
		return FirstLeft;
	};

	ClipperLib.Clipper.prototype.JoinCommonEdges = function ()
	{
		for (var i = 0, ilen = this.m_Joins.length; i < ilen; i++)
		{
			var join = this.m_Joins[i];
			var outRec1 = this.GetOutRec(join.OutPt1.Idx);
			var outRec2 = this.GetOutRec(join.OutPt2.Idx);
			if (outRec1.Pts === null || outRec2.Pts === null)
				continue;

			if (outRec1.IsOpen || outRec2.IsOpen)
			{
				continue;
			}

			//get the polygon fragment with the correct hole state (FirstLeft)
			//before calling JoinPoints() ...
			var holeStateRec;
			if (outRec1 === outRec2)
				holeStateRec = outRec1;
			else if (this.OutRec1RightOfOutRec2(outRec1, outRec2))
				holeStateRec = outRec2;
			else if (this.OutRec1RightOfOutRec2(outRec2, outRec1))
				holeStateRec = outRec1;
			else
				holeStateRec = this.GetLowermostRec(outRec1, outRec2);

			if (!this.JoinPoints(join, outRec1, outRec2)) continue;

			if (outRec1 === outRec2)
			{
				//instead of joining two polygons, we've just created a new one by
				//splitting one polygon into two.
				outRec1.Pts = join.OutPt1;
				outRec1.BottomPt = null;
				outRec2 = this.CreateOutRec();
				outRec2.Pts = join.OutPt2;
				//update all OutRec2.Pts Idx's ...
				this.UpdateOutPtIdxs(outRec2);

				if (this.Poly2ContainsPoly1(outRec2.Pts, outRec1.Pts))
				{
					//outRec1 contains outRec2 ...
					outRec2.IsHole = !outRec1.IsHole;
					outRec2.FirstLeft = outRec1;
					if (this.m_UsingPolyTree)
						this.FixupFirstLefts2(outRec2, outRec1);
					if ((outRec2.IsHole ^ this.ReverseSolution) == (this.Area$1(outRec2) > 0))
						this.ReversePolyPtLinks(outRec2.Pts);
				}
				else if (this.Poly2ContainsPoly1(outRec1.Pts, outRec2.Pts))
				{
					//outRec2 contains outRec1 ...
					outRec2.IsHole = outRec1.IsHole;
					outRec1.IsHole = !outRec2.IsHole;
					outRec2.FirstLeft = outRec1.FirstLeft;
					outRec1.FirstLeft = outRec2;
					if (this.m_UsingPolyTree)
						this.FixupFirstLefts2(outRec1, outRec2);

					if ((outRec1.IsHole ^ this.ReverseSolution) == (this.Area$1(outRec1) > 0))
						this.ReversePolyPtLinks(outRec1.Pts);
				}
				else
				{
					//the 2 polygons are completely separate ...
					outRec2.IsHole = outRec1.IsHole;
					outRec2.FirstLeft = outRec1.FirstLeft;
					//fixup FirstLeft pointers that may need reassigning to OutRec2
					if (this.m_UsingPolyTree)
						this.FixupFirstLefts1(outRec1, outRec2);
				}
			}
			else
			{
				//joined 2 polygons together ...
				outRec2.Pts = null;
				outRec2.BottomPt = null;
				outRec2.Idx = outRec1.Idx;
				outRec1.IsHole = holeStateRec.IsHole;
				if (holeStateRec === outRec2)
					outRec1.FirstLeft = outRec2.FirstLeft;
				outRec2.FirstLeft = outRec1;
				//fixup FirstLeft pointers that may need reassigning to OutRec1
				if (this.m_UsingPolyTree)
					this.FixupFirstLefts3(outRec2, outRec1);
			}
		}
	};

	ClipperLib.Clipper.prototype.UpdateOutPtIdxs = function (outrec)
	{
		var op = outrec.Pts;
		do {
			op.Idx = outrec.Idx;
			op = op.Prev;
		}
		while (op !== outrec.Pts)
	};

	ClipperLib.Clipper.prototype.DoSimplePolygons = function ()
	{
		var i = 0;
		while (i < this.m_PolyOuts.length)
		{
			var outrec = this.m_PolyOuts[i++];
			var op = outrec.Pts;
			if (op === null || outrec.IsOpen)
				continue;
			do //for each Pt in Polygon until duplicate found do ...
			{
				var op2 = op.Next;
				while (op2 !== outrec.Pts)
				{
					if ((ClipperLib.IntPoint.op_Equality(op.Pt, op2.Pt)) && op2.Next !== op && op2.Prev !== op)
					{
						//split the polygon into two ...
						var op3 = op.Prev;
						var op4 = op2.Prev;
						op.Prev = op4;
						op4.Next = op;
						op2.Prev = op3;
						op3.Next = op2;
						outrec.Pts = op;
						var outrec2 = this.CreateOutRec();
						outrec2.Pts = op2;
						this.UpdateOutPtIdxs(outrec2);
						if (this.Poly2ContainsPoly1(outrec2.Pts, outrec.Pts))
						{
							//OutRec2 is contained by OutRec1 ...
							outrec2.IsHole = !outrec.IsHole;
							outrec2.FirstLeft = outrec;
							if (this.m_UsingPolyTree) this.FixupFirstLefts2(outrec2, outrec);

						}
						else if (this.Poly2ContainsPoly1(outrec.Pts, outrec2.Pts))
						{
							//OutRec1 is contained by OutRec2 ...
							outrec2.IsHole = outrec.IsHole;
							outrec.IsHole = !outrec2.IsHole;
							outrec2.FirstLeft = outrec.FirstLeft;
							outrec.FirstLeft = outrec2;
							if (this.m_UsingPolyTree) this.FixupFirstLefts2(outrec, outrec2);
						}
						else
						{
							//the 2 polygons are separate ...
							outrec2.IsHole = outrec.IsHole;
							outrec2.FirstLeft = outrec.FirstLeft;
							if (this.m_UsingPolyTree) this.FixupFirstLefts1(outrec, outrec2);
						}
						op2 = op;
						//ie get ready for the next iteration
					}
					op2 = op2.Next;
				}
				op = op.Next;
			}
			while (op !== outrec.Pts)
		}
	};

	ClipperLib.Clipper.Area = function (poly)
	{
		if (!Array.isArray(poly))
			return 0;
		var cnt = poly.length;
		if (cnt < 3)
			return 0;
		var a = 0;
		for (var i = 0, j = cnt - 1; i < cnt; ++i)
		{
			a += (poly[j].X + poly[i].X) * (poly[j].Y - poly[i].Y);
			j = i;
		}
		return -a * 0.5;
	};

	ClipperLib.Clipper.prototype.Area = function (op)
	{
		var opFirst = op;
		if (op === null) return 0;
		var a = 0;
		do {
			a = a + (op.Prev.Pt.X + op.Pt.X) * (op.Prev.Pt.Y - op.Pt.Y);
			op = op.Next;
		} while (op !== opFirst); // && typeof op !== 'undefined');
		return a * 0.5;
	};

	ClipperLib.Clipper.prototype.Area$1 = function (outRec)
	{
		return this.Area(outRec.Pts);
	};

	ClipperLib.Clipper.SimplifyPolygon = function (poly, fillType)
	{
		var result = new Array();
		var c = new ClipperLib.Clipper(0);
		c.StrictlySimple = true;
		c.AddPath(poly, ClipperLib.PolyType.ptSubject, true);
		c.Execute(ClipperLib.ClipType.ctUnion, result, fillType, fillType);
		return result;
	};

	ClipperLib.Clipper.SimplifyPolygons = function (polys, fillType)
	{
		if (typeof (fillType) === "undefined") fillType = ClipperLib.PolyFillType.pftEvenOdd;
		var result = new Array();
		var c = new ClipperLib.Clipper(0);
		c.StrictlySimple = true;
		c.AddPaths(polys, ClipperLib.PolyType.ptSubject, true);
		c.Execute(ClipperLib.ClipType.ctUnion, result, fillType, fillType);
		return result;
	};

	ClipperLib.Clipper.DistanceSqrd = function (pt1, pt2)
	{
		var dx = (pt1.X - pt2.X);
		var dy = (pt1.Y - pt2.Y);
		return (dx * dx + dy * dy);
	};

	ClipperLib.Clipper.DistanceFromLineSqrd = function (pt, ln1, ln2)
	{
		//The equation of a line in general form (Ax + By + C = 0)
		//given 2 points (x¹,y¹) & (x²,y²) is ...
		//(y¹ - y²)x + (x² - x¹)y + (y² - y¹)x¹ - (x² - x¹)y¹ = 0
		//A = (y¹ - y²); B = (x² - x¹); C = (y² - y¹)x¹ - (x² - x¹)y¹
		//perpendicular distance of point (x³,y³) = (Ax³ + By³ + C)/Sqrt(A² + B²)
		//see http://en.wikipedia.org/wiki/Perpendicular_distance
		var A = ln1.Y - ln2.Y;
		var B = ln2.X - ln1.X;
		var C = A * ln1.X + B * ln1.Y;
		C = A * pt.X + B * pt.Y - C;
		return (C * C) / (A * A + B * B);
	};

	ClipperLib.Clipper.SlopesNearCollinear = function (pt1, pt2, pt3, distSqrd)
	{
		//this function is more accurate when the point that's GEOMETRICALLY
		//between the other 2 points is the one that's tested for distance.
		//nb: with 'spikes', either pt1 or pt3 is geometrically between the other pts
		if (Math.abs(pt1.X - pt2.X) > Math.abs(pt1.Y - pt2.Y))
		{
			if ((pt1.X > pt2.X) === (pt1.X < pt3.X))
				return ClipperLib.Clipper.DistanceFromLineSqrd(pt1, pt2, pt3) < distSqrd;
			else if ((pt2.X > pt1.X) === (pt2.X < pt3.X))
				return ClipperLib.Clipper.DistanceFromLineSqrd(pt2, pt1, pt3) < distSqrd;
			else
				return ClipperLib.Clipper.DistanceFromLineSqrd(pt3, pt1, pt2) < distSqrd;
		}
		else
		{
			if ((pt1.Y > pt2.Y) === (pt1.Y < pt3.Y))
				return ClipperLib.Clipper.DistanceFromLineSqrd(pt1, pt2, pt3) < distSqrd;
			else if ((pt2.Y > pt1.Y) === (pt2.Y < pt3.Y))
				return ClipperLib.Clipper.DistanceFromLineSqrd(pt2, pt1, pt3) < distSqrd;
			else
				return ClipperLib.Clipper.DistanceFromLineSqrd(pt3, pt1, pt2) < distSqrd;
		}
	};

	ClipperLib.Clipper.PointsAreClose = function (pt1, pt2, distSqrd)
	{
		var dx = pt1.X - pt2.X;
		var dy = pt1.Y - pt2.Y;
		return ((dx * dx) + (dy * dy) <= distSqrd);
	};

	ClipperLib.Clipper.ExcludeOp = function (op)
	{
		var result = op.Prev;
		result.Next = op.Next;
		op.Next.Prev = result;
		result.Idx = 0;
		return result;
	};

	ClipperLib.Clipper.CleanPolygon = function (path, distance)
	{
		if (typeof (distance) === "undefined") distance = 1.415;
		//distance = proximity in units/pixels below which vertices will be stripped.
		//Default ~= sqrt(2) so when adjacent vertices or semi-adjacent vertices have
		//both x & y coords within 1 unit, then the second vertex will be stripped.
		var cnt = path.length;
		if (cnt === 0)
			return new Array();
		var outPts = new Array(cnt);
		for (var i = 0; i < cnt; ++i)
			outPts[i] = new ClipperLib.OutPt();
		for (var i = 0; i < cnt; ++i)
		{
			outPts[i].Pt = path[i];
			outPts[i].Next = outPts[(i + 1) % cnt];
			outPts[i].Next.Prev = outPts[i];
			outPts[i].Idx = 0;
		}
		var distSqrd = distance * distance;
		var op = outPts[0];
		while (op.Idx === 0 && op.Next !== op.Prev)
		{
			if (ClipperLib.Clipper.PointsAreClose(op.Pt, op.Prev.Pt, distSqrd))
			{
				op = ClipperLib.Clipper.ExcludeOp(op);
				cnt--;
			}
			else if (ClipperLib.Clipper.PointsAreClose(op.Prev.Pt, op.Next.Pt, distSqrd))
			{
				ClipperLib.Clipper.ExcludeOp(op.Next);
				op = ClipperLib.Clipper.ExcludeOp(op);
				cnt -= 2;
			}
			else if (ClipperLib.Clipper.SlopesNearCollinear(op.Prev.Pt, op.Pt, op.Next.Pt, distSqrd))
			{
				op = ClipperLib.Clipper.ExcludeOp(op);
				cnt--;
			}
			else
			{
				op.Idx = 1;
				op = op.Next;
			}
		}
		if (cnt < 3)
			cnt = 0;
		var result = new Array(cnt);
		for (var i = 0; i < cnt; ++i)
		{
			result[i] = new ClipperLib.IntPoint1(op.Pt);
			op = op.Next;
		}
		outPts = null;
		return result;
	};

	ClipperLib.Clipper.CleanPolygons = function (polys, distance)
	{
		var result = new Array(polys.length);
		for (var i = 0, ilen = polys.length; i < ilen; i++)
			result[i] = ClipperLib.Clipper.CleanPolygon(polys[i], distance);
		return result;
	};

	ClipperLib.Clipper.Minkowski = function (pattern, path, IsSum, IsClosed)
	{
		var delta = (IsClosed ? 1 : 0);
		var polyCnt = pattern.length;
		var pathCnt = path.length;
		var result = new Array();
		if (IsSum)
			for (var i = 0; i < pathCnt; i++)
			{
				var p = new Array(polyCnt);
				for (var j = 0, jlen = pattern.length, ip = pattern[j]; j < jlen; j++, ip = pattern[j])
					p[j] = new ClipperLib.IntPoint2(path[i].X + ip.X, path[i].Y + ip.Y);
				result.push(p);
			}
		else
			for (var i = 0; i < pathCnt; i++)
			{
				var p = new Array(polyCnt);
				for (var j = 0, jlen = pattern.length, ip = pattern[j]; j < jlen; j++, ip = pattern[j])
					p[j] = new ClipperLib.IntPoint2(path[i].X - ip.X, path[i].Y - ip.Y);
				result.push(p);
			}
		var quads = new Array();
		for (var i = 0; i < pathCnt - 1 + delta; i++)
			for (var j = 0; j < polyCnt; j++)
			{
				var quad = new Array();
				quad.push(result[i % pathCnt][j % polyCnt]);
				quad.push(result[(i + 1) % pathCnt][j % polyCnt]);
				quad.push(result[(i + 1) % pathCnt][(j + 1) % polyCnt]);
				quad.push(result[i % pathCnt][(j + 1) % polyCnt]);
				if (!ClipperLib.Clipper.Orientation(quad))
					quad.reverse();
				quads.push(quad);
			}
		return quads;
	};

	ClipperLib.Clipper.MinkowskiSum = function (pattern, path_or_paths, pathIsClosed)
	{
		if (!(path_or_paths[0] instanceof Array))
		{
			var path = path_or_paths;
			var paths = ClipperLib.Clipper.Minkowski(pattern, path, true, pathIsClosed);
			var c = new ClipperLib.Clipper();
			c.AddPaths(paths, ClipperLib.PolyType.ptSubject, true);
			c.Execute(ClipperLib.ClipType.ctUnion, paths, ClipperLib.PolyFillType.pftNonZero, ClipperLib.PolyFillType.pftNonZero);
			return paths;
		}
		else
		{
			var paths = path_or_paths;
			var solution = new ClipperLib.Paths();
			var c = new ClipperLib.Clipper();
			for (var i = 0; i < paths.length; ++i)
			{
				var tmp = ClipperLib.Clipper.Minkowski(pattern, paths[i], true, pathIsClosed);
				c.AddPaths(tmp, ClipperLib.PolyType.ptSubject, true);
				if (pathIsClosed)
				{
					var path = ClipperLib.Clipper.TranslatePath(paths[i], pattern[0]);
					c.AddPath(path, ClipperLib.PolyType.ptClip, true);
				}
			}
			c.Execute(ClipperLib.ClipType.ctUnion, solution,
				ClipperLib.PolyFillType.pftNonZero, ClipperLib.PolyFillType.pftNonZero);
			return solution;
		}
	};

	ClipperLib.Clipper.TranslatePath = function (path, delta)
	{
		var outPath = new ClipperLib.Path();
		for (var i = 0; i < path.length; i++)
			outPath.push(new ClipperLib.IntPoint2(path[i].X + delta.X, path[i].Y + delta.Y));
		return outPath;
	};

	ClipperLib.Clipper.MinkowskiDiff = function (poly1, poly2)
	{
		var paths = ClipperLib.Clipper.Minkowski(poly1, poly2, false, true);
		var c = new ClipperLib.Clipper();
		c.AddPaths(paths, ClipperLib.PolyType.ptSubject, true);
		c.Execute(ClipperLib.ClipType.ctUnion, paths, ClipperLib.PolyFillType.pftNonZero, ClipperLib.PolyFillType.pftNonZero);
		return paths;
	};

	ClipperLib.Clipper.PolyTreeToPaths = function (polytree)
	{
		var result = new Array();
		//result.set_Capacity(polytree.get_Total());
		ClipperLib.Clipper.AddPolyNodeToPaths(polytree, ClipperLib.Clipper.NodeType.ntAny, result);
		return result;
	};

	ClipperLib.Clipper.AddPolyNodeToPaths = function (polynode, nt, paths)
	{
		var match = true;
		switch (nt)
		{
		case ClipperLib.Clipper.NodeType.ntOpen:
			return;
		case ClipperLib.Clipper.NodeType.ntClosed:
			match = !polynode.IsOpen;
			break;
		default:
			break;
		}
		if (polynode.m_polygon.length > 0 && match)
			paths.push(polynode.m_polygon);
		for (var $i3 = 0, $t3 = polynode.Childs(), $l3 = $t3.length, pn = $t3[$i3]; $i3 < $l3; $i3++, pn = $t3[$i3])
			ClipperLib.Clipper.AddPolyNodeToPaths(pn, nt, paths);
	};

	ClipperLib.Clipper.OpenPathsFromPolyTree = function (polytree)
	{
		var result = new ClipperLib.Paths();
		//result.set_Capacity(polytree.ChildCount());
		for (var i = 0, ilen = polytree.ChildCount(); i < ilen; i++)
			if (polytree.Childs()[i].IsOpen)
				result.push(polytree.Childs()[i].m_polygon);
		return result;
	};

	ClipperLib.Clipper.ClosedPathsFromPolyTree = function (polytree)
	{
		var result = new ClipperLib.Paths();
		//result.set_Capacity(polytree.Total());
		ClipperLib.Clipper.AddPolyNodeToPaths(polytree, ClipperLib.Clipper.NodeType.ntClosed, result);
		return result;
	};

	Inherit(ClipperLib.Clipper, ClipperLib.ClipperBase);
	ClipperLib.Clipper.NodeType = {
		ntAny: 0,
		ntOpen: 1,
		ntClosed: 2
	};

	/**
	* @constructor
	*/
	ClipperLib.ClipperOffset = function (miterLimit, arcTolerance)
	{
		if (typeof (miterLimit) === "undefined") miterLimit = 2;
		if (typeof (arcTolerance) === "undefined") arcTolerance = ClipperLib.ClipperOffset.def_arc_tolerance;
		this.m_destPolys = new ClipperLib.Paths();
		this.m_srcPoly = new ClipperLib.Path();
		this.m_destPoly = new ClipperLib.Path();
		this.m_normals = new Array();
		this.m_delta = 0;
		this.m_sinA = 0;
		this.m_sin = 0;
		this.m_cos = 0;
		this.m_miterLim = 0;
		this.m_StepsPerRad = 0;
		this.m_lowest = new ClipperLib.IntPoint0();
		this.m_polyNodes = new ClipperLib.PolyNode();
		this.MiterLimit = miterLimit;
		this.ArcTolerance = arcTolerance;
		this.m_lowest.X = -1;
	};

	ClipperLib.ClipperOffset.two_pi = 6.28318530717959;
	ClipperLib.ClipperOffset.def_arc_tolerance = 0.25;
	ClipperLib.ClipperOffset.prototype.Clear = function ()
	{
		ClipperLib.Clear(this.m_polyNodes.Childs());
		this.m_lowest.X = -1;
	};

	ClipperLib.ClipperOffset.Round = ClipperLib.Clipper.Round;
	ClipperLib.ClipperOffset.prototype.AddPath = function (path, joinType, endType)
	{
		var highI = path.length - 1;
		if (highI < 0)
			return;
		var newNode = new ClipperLib.PolyNode();
		newNode.m_jointype = joinType;
		newNode.m_endtype = endType;
		//strip duplicate points from path and also get index to the lowest point ...
		if (endType === ClipperLib.EndType.etClosedLine || endType === ClipperLib.EndType.etClosedPolygon)
			while (highI > 0 && ClipperLib.IntPoint.op_Equality(path[0], path[highI]))
				highI--;
		//newNode.m_polygon.set_Capacity(highI + 1);
		newNode.m_polygon.push(path[0]);
		var j = 0,
			k = 0;
		for (var i = 1; i <= highI; i++)
			if (ClipperLib.IntPoint.op_Inequality(newNode.m_polygon[j], path[i]))
			{
				j++;
				newNode.m_polygon.push(path[i]);
				if (path[i].Y > newNode.m_polygon[k].Y || (path[i].Y === newNode.m_polygon[k].Y && path[i].X < newNode.m_polygon[k].X))
					k = j;
			}
		if (endType === ClipperLib.EndType.etClosedPolygon && j < 2) return;

		this.m_polyNodes.AddChild(newNode);
		//if this path's lowest pt is lower than all the others then update m_lowest
		if (endType !== ClipperLib.EndType.etClosedPolygon)
			return;
		if (this.m_lowest.X < 0)
			this.m_lowest = new ClipperLib.IntPoint2(this.m_polyNodes.ChildCount() - 1, k);
		else
		{
			var ip = this.m_polyNodes.Childs()[this.m_lowest.X].m_polygon[this.m_lowest.Y];
			if (newNode.m_polygon[k].Y > ip.Y || (newNode.m_polygon[k].Y === ip.Y && newNode.m_polygon[k].X < ip.X))
				this.m_lowest = new ClipperLib.IntPoint2(this.m_polyNodes.ChildCount() - 1, k);
		}
	};

	ClipperLib.ClipperOffset.prototype.AddPaths = function (paths, joinType, endType)
	{
		for (var i = 0, ilen = paths.length; i < ilen; i++)
			this.AddPath(paths[i], joinType, endType);
	};

	ClipperLib.ClipperOffset.prototype.FixOrientations = function ()
	{
		//fixup orientations of all closed paths if the orientation of the
		//closed path with the lowermost vertex is wrong ...
		if (this.m_lowest.X >= 0 && !ClipperLib.Clipper.Orientation(this.m_polyNodes.Childs()[this.m_lowest.X].m_polygon))
		{
			for (var i = 0; i < this.m_polyNodes.ChildCount(); i++)
			{
				var node = this.m_polyNodes.Childs()[i];
				if (node.m_endtype === ClipperLib.EndType.etClosedPolygon || (node.m_endtype === ClipperLib.EndType.etClosedLine && ClipperLib.Clipper.Orientation(node.m_polygon)))
					node.m_polygon.reverse();
			}
		}
		else
		{
			for (var i = 0; i < this.m_polyNodes.ChildCount(); i++)
			{
				var node = this.m_polyNodes.Childs()[i];
				if (node.m_endtype === ClipperLib.EndType.etClosedLine && !ClipperLib.Clipper.Orientation(node.m_polygon))
					node.m_polygon.reverse();
			}
		}
	};

	ClipperLib.ClipperOffset.GetUnitNormal = function (pt1, pt2)
	{
		var dx = (pt2.X - pt1.X);
		var dy = (pt2.Y - pt1.Y);
		if ((dx === 0) && (dy === 0))
			return new ClipperLib.DoublePoint2(0, 0);
		var f = 1 / Math.sqrt(dx * dx + dy * dy);
		dx *= f;
		dy *= f;
		return new ClipperLib.DoublePoint2(dy, -dx);
	};

	ClipperLib.ClipperOffset.prototype.DoOffset = function (delta)
	{
		this.m_destPolys = new Array();
		this.m_delta = delta;
		//if Zero offset, just copy any CLOSED polygons to m_p and return ...
		if (ClipperLib.ClipperBase.near_zero(delta))
		{
			//this.m_destPolys.set_Capacity(this.m_polyNodes.ChildCount);
			for (var i = 0; i < this.m_polyNodes.ChildCount(); i++)
			{
				var node = this.m_polyNodes.Childs()[i];
				if (node.m_endtype === ClipperLib.EndType.etClosedPolygon)
					this.m_destPolys.push(node.m_polygon);
			}
			return;
		}
		//see offset_triginometry3.svg in the documentation folder ...
		if (this.MiterLimit > 2)
			this.m_miterLim = 2 / (this.MiterLimit * this.MiterLimit);
		else
			this.m_miterLim = 0.5;
		var y;
		if (this.ArcTolerance <= 0)
			y = ClipperLib.ClipperOffset.def_arc_tolerance;
		else if (this.ArcTolerance > Math.abs(delta) * ClipperLib.ClipperOffset.def_arc_tolerance)
			y = Math.abs(delta) * ClipperLib.ClipperOffset.def_arc_tolerance;
		else
			y = this.ArcTolerance;
		//see offset_triginometry2.svg in the documentation folder ...
		var steps = 3.14159265358979 / Math.acos(1 - y / Math.abs(delta));
		this.m_sin = Math.sin(ClipperLib.ClipperOffset.two_pi / steps);
		this.m_cos = Math.cos(ClipperLib.ClipperOffset.two_pi / steps);
		this.m_StepsPerRad = steps / ClipperLib.ClipperOffset.two_pi;
		if (delta < 0)
			this.m_sin = -this.m_sin;
		//this.m_destPolys.set_Capacity(this.m_polyNodes.ChildCount * 2);
		for (var i = 0; i < this.m_polyNodes.ChildCount(); i++)
		{
			var node = this.m_polyNodes.Childs()[i];
			this.m_srcPoly = node.m_polygon;
			var len = this.m_srcPoly.length;
			if (len === 0 || (delta <= 0 && (len < 3 || node.m_endtype !== ClipperLib.EndType.etClosedPolygon)))
				continue;
			this.m_destPoly = new Array();
			if (len === 1)
			{
				if (node.m_jointype === ClipperLib.JoinType.jtRound)
				{
					var X = 1,
						Y = 0;
					for (var j = 1; j <= steps; j++)
					{
						this.m_destPoly.push(new ClipperLib.IntPoint2(ClipperLib.ClipperOffset.Round(this.m_srcPoly[0].X + X * delta), ClipperLib.ClipperOffset.Round(this.m_srcPoly[0].Y + Y * delta)));
						var X2 = X;
						X = X * this.m_cos - this.m_sin * Y;
						Y = X2 * this.m_sin + Y * this.m_cos;
					}
				}
				else
				{
					var X = -1,
						Y = -1;
					for (var j = 0; j < 4; ++j)
					{
						this.m_destPoly.push(new ClipperLib.IntPoint2(ClipperLib.ClipperOffset.Round(this.m_srcPoly[0].X + X * delta), ClipperLib.ClipperOffset.Round(this.m_srcPoly[0].Y + Y * delta)));
						if (X < 0)
							X = 1;
						else if (Y < 0)
							Y = 1;
						else
							X = -1;
					}
				}
				this.m_destPolys.push(this.m_destPoly);
				continue;
			}
			//build m_normals ...
			this.m_normals.length = 0;
			//this.m_normals.set_Capacity(len);
			for (var j = 0; j < len - 1; j++)
				this.m_normals.push(ClipperLib.ClipperOffset.GetUnitNormal(this.m_srcPoly[j], this.m_srcPoly[j + 1]));
			if (node.m_endtype === ClipperLib.EndType.etClosedLine || node.m_endtype === ClipperLib.EndType.etClosedPolygon)
				this.m_normals.push(ClipperLib.ClipperOffset.GetUnitNormal(this.m_srcPoly[len - 1], this.m_srcPoly[0]));
			else
				this.m_normals.push(new ClipperLib.DoublePoint1(this.m_normals[len - 2]));
			if (node.m_endtype === ClipperLib.EndType.etClosedPolygon)
			{
				var k = len - 1;
				for (var j = 0; j < len; j++)
					k = this.OffsetPoint(j, k, node.m_jointype);
				this.m_destPolys.push(this.m_destPoly);
			}
			else if (node.m_endtype === ClipperLib.EndType.etClosedLine)
			{
				var k = len - 1;
				for (var j = 0; j < len; j++)
					k = this.OffsetPoint(j, k, node.m_jointype);
				this.m_destPolys.push(this.m_destPoly);
				this.m_destPoly = new Array();
				//re-build m_normals ...
				var n = this.m_normals[len - 1];
				for (var j = len - 1; j > 0; j--)
					this.m_normals[j] = new ClipperLib.DoublePoint2(-this.m_normals[j - 1].X, -this.m_normals[j - 1].Y);
				this.m_normals[0] = new ClipperLib.DoublePoint2(-n.X, -n.Y);
				k = 0;
				for (var j = len - 1; j >= 0; j--)
					k = this.OffsetPoint(j, k, node.m_jointype);
				this.m_destPolys.push(this.m_destPoly);
			}
			else
			{
				var k = 0;
				for (var j = 1; j < len - 1; ++j)
					k = this.OffsetPoint(j, k, node.m_jointype);
				var pt1;
				if (node.m_endtype === ClipperLib.EndType.etOpenButt)
				{
					var j = len - 1;
					pt1 = new ClipperLib.IntPoint2(ClipperLib.ClipperOffset.Round(this.m_srcPoly[j].X + this.m_normals[j].X * delta), ClipperLib.ClipperOffset.Round(this.m_srcPoly[j].Y + this.m_normals[j].Y * delta));
					this.m_destPoly.push(pt1);
					pt1 = new ClipperLib.IntPoint2(ClipperLib.ClipperOffset.Round(this.m_srcPoly[j].X - this.m_normals[j].X * delta), ClipperLib.ClipperOffset.Round(this.m_srcPoly[j].Y - this.m_normals[j].Y * delta));
					this.m_destPoly.push(pt1);
				}
				else
				{
					var j = len - 1;
					k = len - 2;
					this.m_sinA = 0;
					this.m_normals[j] = new ClipperLib.DoublePoint2(-this.m_normals[j].X, -this.m_normals[j].Y);
					if (node.m_endtype === ClipperLib.EndType.etOpenSquare)
						this.DoSquare(j, k);
					else
						this.DoRound(j, k);
				}
				//re-build m_normals ...
				for (var j = len - 1; j > 0; j--)
					this.m_normals[j] = new ClipperLib.DoublePoint2(-this.m_normals[j - 1].X, -this.m_normals[j - 1].Y);
				this.m_normals[0] = new ClipperLib.DoublePoint2(-this.m_normals[1].X, -this.m_normals[1].Y);
				k = len - 1;
				for (var j = k - 1; j > 0; --j)
					k = this.OffsetPoint(j, k, node.m_jointype);
				if (node.m_endtype === ClipperLib.EndType.etOpenButt)
				{
					pt1 = new ClipperLib.IntPoint2(ClipperLib.ClipperOffset.Round(this.m_srcPoly[0].X - this.m_normals[0].X * delta), ClipperLib.ClipperOffset.Round(this.m_srcPoly[0].Y - this.m_normals[0].Y * delta));
					this.m_destPoly.push(pt1);
					pt1 = new ClipperLib.IntPoint2(ClipperLib.ClipperOffset.Round(this.m_srcPoly[0].X + this.m_normals[0].X * delta), ClipperLib.ClipperOffset.Round(this.m_srcPoly[0].Y + this.m_normals[0].Y * delta));
					this.m_destPoly.push(pt1);
				}
				else
				{
					k = 1;
					this.m_sinA = 0;
					if (node.m_endtype === ClipperLib.EndType.etOpenSquare)
						this.DoSquare(0, 1);
					else
						this.DoRound(0, 1);
				}
				this.m_destPolys.push(this.m_destPoly);
			}
		}
	};

	ClipperLib.ClipperOffset.prototype.Execute = function ()
	{
		var a = arguments,
			ispolytree = a[0] instanceof ClipperLib.PolyTree;
		if (!ispolytree) // function (solution, delta)
		{
			var solution = a[0],
				delta = a[1];
			ClipperLib.Clear(solution);
			this.FixOrientations();
			this.DoOffset(delta);
			//now clean up 'corners' ...
			var clpr = new ClipperLib.Clipper(0);
			clpr.AddPaths(this.m_destPolys, ClipperLib.PolyType.ptSubject, true);
			if (delta > 0)
			{
				clpr.Execute(ClipperLib.ClipType.ctUnion, solution, ClipperLib.PolyFillType.pftPositive, ClipperLib.PolyFillType.pftPositive);
			}
			else
			{
				var r = ClipperLib.Clipper.GetBounds(this.m_destPolys);
				var outer = new ClipperLib.Path();
				outer.push(new ClipperLib.IntPoint2(r.left - 10, r.bottom + 10));
				outer.push(new ClipperLib.IntPoint2(r.right + 10, r.bottom + 10));
				outer.push(new ClipperLib.IntPoint2(r.right + 10, r.top - 10));
				outer.push(new ClipperLib.IntPoint2(r.left - 10, r.top - 10));
				clpr.AddPath(outer, ClipperLib.PolyType.ptSubject, true);
				clpr.ReverseSolution = true;
				clpr.Execute(ClipperLib.ClipType.ctUnion, solution, ClipperLib.PolyFillType.pftNegative, ClipperLib.PolyFillType.pftNegative);
				if (solution.length > 0)
					solution.splice(0, 1);
			}
			//console.log(JSON.stringify(solution));
		}
		else // function (polytree, delta)
		{
			var solution = a[0],
				delta = a[1];
			solution.Clear();
			this.FixOrientations();
			this.DoOffset(delta);
			//now clean up 'corners' ...
			var clpr = new ClipperLib.Clipper(0);
			clpr.AddPaths(this.m_destPolys, ClipperLib.PolyType.ptSubject, true);
			if (delta > 0)
			{
				clpr.Execute(ClipperLib.ClipType.ctUnion, solution, ClipperLib.PolyFillType.pftPositive, ClipperLib.PolyFillType.pftPositive);
			}
			else
			{
				var r = ClipperLib.Clipper.GetBounds(this.m_destPolys);
				var outer = new ClipperLib.Path();
				outer.push(new ClipperLib.IntPoint2(r.left - 10, r.bottom + 10));
				outer.push(new ClipperLib.IntPoint2(r.right + 10, r.bottom + 10));
				outer.push(new ClipperLib.IntPoint2(r.right + 10, r.top - 10));
				outer.push(new ClipperLib.IntPoint2(r.left - 10, r.top - 10));
				clpr.AddPath(outer, ClipperLib.PolyType.ptSubject, true);
				clpr.ReverseSolution = true;
				clpr.Execute(ClipperLib.ClipType.ctUnion, solution, ClipperLib.PolyFillType.pftNegative, ClipperLib.PolyFillType.pftNegative);
				//remove the outer PolyNode rectangle ...
				if (solution.ChildCount() === 1 && solution.Childs()[0].ChildCount() > 0)
				{
					var outerNode = solution.Childs()[0];
					//solution.Childs.set_Capacity(outerNode.ChildCount);
					solution.Childs()[0] = outerNode.Childs()[0];
					solution.Childs()[0].m_Parent = solution;
					for (var i = 1; i < outerNode.ChildCount(); i++)
						solution.AddChild(outerNode.Childs()[i]);
				}
				else
					solution.Clear();
			}
		}
	};

	ClipperLib.ClipperOffset.prototype.OffsetPoint = function (j, k, jointype)
	{
		//cross product ...
		this.m_sinA = (this.m_normals[k].X * this.m_normals[j].Y - this.m_normals[j].X * this.m_normals[k].Y);

		if (Math.abs(this.m_sinA * this.m_delta) < 1.0)
		{
			//dot product ...
			var cosA = (this.m_normals[k].X * this.m_normals[j].X + this.m_normals[j].Y * this.m_normals[k].Y);
			if (cosA > 0) // angle ==> 0 degrees
			{
				this.m_destPoly.push(new ClipperLib.IntPoint2(ClipperLib.ClipperOffset.Round(this.m_srcPoly[j].X + this.m_normals[k].X * this.m_delta),
					ClipperLib.ClipperOffset.Round(this.m_srcPoly[j].Y + this.m_normals[k].Y * this.m_delta)));
				return k;
			}
			//else angle ==> 180 degrees
		}
		else if (this.m_sinA > 1)
			this.m_sinA = 1.0;
		else if (this.m_sinA < -1)
			this.m_sinA = -1.0;
		if (this.m_sinA * this.m_delta < 0)
		{
			this.m_destPoly.push(new ClipperLib.IntPoint2(ClipperLib.ClipperOffset.Round(this.m_srcPoly[j].X + this.m_normals[k].X * this.m_delta),
				ClipperLib.ClipperOffset.Round(this.m_srcPoly[j].Y + this.m_normals[k].Y * this.m_delta)));
			this.m_destPoly.push(new ClipperLib.IntPoint1(this.m_srcPoly[j]));
			this.m_destPoly.push(new ClipperLib.IntPoint2(ClipperLib.ClipperOffset.Round(this.m_srcPoly[j].X + this.m_normals[j].X * this.m_delta),
				ClipperLib.ClipperOffset.Round(this.m_srcPoly[j].Y + this.m_normals[j].Y * this.m_delta)));
		}
		else
			switch (jointype)
			{
			case ClipperLib.JoinType.jtMiter:
				{
					var r = 1 + (this.m_normals[j].X * this.m_normals[k].X + this.m_normals[j].Y * this.m_normals[k].Y);
					if (r >= this.m_miterLim)
						this.DoMiter(j, k, r);
					else
						this.DoSquare(j, k);
					break;
				}
			case ClipperLib.JoinType.jtSquare:
				this.DoSquare(j, k);
				break;
			case ClipperLib.JoinType.jtRound:
				this.DoRound(j, k);
				break;
			}
		k = j;
		return k;
	};

	ClipperLib.ClipperOffset.prototype.DoSquare = function (j, k)
	{
		var dx = Math.tan(Math.atan2(this.m_sinA,
			this.m_normals[k].X * this.m_normals[j].X + this.m_normals[k].Y * this.m_normals[j].Y) / 4);
		this.m_destPoly.push(new ClipperLib.IntPoint2(
			ClipperLib.ClipperOffset.Round(this.m_srcPoly[j].X + this.m_delta * (this.m_normals[k].X - this.m_normals[k].Y * dx)),
			ClipperLib.ClipperOffset.Round(this.m_srcPoly[j].Y + this.m_delta * (this.m_normals[k].Y + this.m_normals[k].X * dx))));
		this.m_destPoly.push(new ClipperLib.IntPoint2(
			ClipperLib.ClipperOffset.Round(this.m_srcPoly[j].X + this.m_delta * (this.m_normals[j].X + this.m_normals[j].Y * dx)),
			ClipperLib.ClipperOffset.Round(this.m_srcPoly[j].Y + this.m_delta * (this.m_normals[j].Y - this.m_normals[j].X * dx))));
	};

	ClipperLib.ClipperOffset.prototype.DoMiter = function (j, k, r)
	{
		var q = this.m_delta / r;
		this.m_destPoly.push(new ClipperLib.IntPoint2(
			ClipperLib.ClipperOffset.Round(this.m_srcPoly[j].X + (this.m_normals[k].X + this.m_normals[j].X) * q),
			ClipperLib.ClipperOffset.Round(this.m_srcPoly[j].Y + (this.m_normals[k].Y + this.m_normals[j].Y) * q)));
	};

	ClipperLib.ClipperOffset.prototype.DoRound = function (j, k)
	{
		var a = Math.atan2(this.m_sinA,
			this.m_normals[k].X * this.m_normals[j].X + this.m_normals[k].Y * this.m_normals[j].Y);

		var steps = Math.max(ClipperLib.Cast_Int32(ClipperLib.ClipperOffset.Round(this.m_StepsPerRad * Math.abs(a))), 1);

		var X = this.m_normals[k].X,
			Y = this.m_normals[k].Y,
			X2;
		for (var i = 0; i < steps; ++i)
		{
			this.m_destPoly.push(new ClipperLib.IntPoint2(
				ClipperLib.ClipperOffset.Round(this.m_srcPoly[j].X + X * this.m_delta),
				ClipperLib.ClipperOffset.Round(this.m_srcPoly[j].Y + Y * this.m_delta)));
			X2 = X;
			X = X * this.m_cos - this.m_sin * Y;
			Y = X2 * this.m_sin + Y * this.m_cos;
		}
		this.m_destPoly.push(new ClipperLib.IntPoint2(
			ClipperLib.ClipperOffset.Round(this.m_srcPoly[j].X + this.m_normals[j].X * this.m_delta),
			ClipperLib.ClipperOffset.Round(this.m_srcPoly[j].Y + this.m_normals[j].Y * this.m_delta)));
	};

	ClipperLib.Error = function (message)
	{
		try
		{
			throw new Error(message);
		}
		catch (err)
		{
			alert(err.message);
		}
	};

	// ---------------------------------------------

	// JS extension by Timo 2013
	ClipperLib.JS = {};

	ClipperLib.JS.AreaOfPolygon = function (poly, scale)
	{
		if (!scale) scale = 1;
		return ClipperLib.Clipper.Area(poly) / (scale * scale);
	};

	ClipperLib.JS.AreaOfPolygons = function (poly, scale)
	{
		if (!scale) scale = 1;
		var area = 0;
		for (var i = 0; i < poly.length; i++)
		{
			area += ClipperLib.Clipper.Area(poly[i]);
		}
		return area / (scale * scale);
	};

	ClipperLib.JS.BoundsOfPath = function (path, scale)
	{
		return ClipperLib.JS.BoundsOfPaths([path], scale);
	};

	ClipperLib.JS.BoundsOfPaths = function (paths, scale)
	{
		if (!scale) scale = 1;
		var bounds = ClipperLib.Clipper.GetBounds(paths);
		bounds.left /= scale;
		bounds.bottom /= scale;
		bounds.right /= scale;
		bounds.top /= scale;
		return bounds;
	};

	// Clean() joins vertices that are too near each other
	// and causes distortion to offsetted polygons without cleaning
	ClipperLib.JS.Clean = function (polygon, delta)
	{
		if (!(polygon instanceof Array)) return [];
		var isPolygons = polygon[0] instanceof Array;
		var polygon = ClipperLib.JS.Clone(polygon);
		if (typeof delta !== "number" || delta === null)
		{
			ClipperLib.Error("Delta is not a number in Clean().");
			return polygon;
		}
		if (polygon.length === 0 || (polygon.length === 1 && polygon[0].length === 0) || delta < 0) return polygon;
		if (!isPolygons) polygon = [polygon];
		var k_length = polygon.length;
		var len, poly, result, d, p, j, i;
		var results = [];
		for (var k = 0; k < k_length; k++)
		{
			poly = polygon[k];
			len = poly.length;
			if (len === 0) continue;
			else if (len < 3)
			{
				result = poly;
				results.push(result);
				continue;
			}
			result = poly;
			d = delta * delta;
			//d = Math.floor(c_delta * c_delta);
			p = poly[0];
			j = 1;
			for (i = 1; i < len; i++)
			{
				if ((poly[i].X - p.X) * (poly[i].X - p.X) +
					(poly[i].Y - p.Y) * (poly[i].Y - p.Y) <= d)
					continue;
				result[j] = poly[i];
				p = poly[i];
				j++;
			}
			p = poly[j - 1];
			if ((poly[0].X - p.X) * (poly[0].X - p.X) +
				(poly[0].Y - p.Y) * (poly[0].Y - p.Y) <= d)
				j--;
			if (j < len)
				result.splice(j, len - j);
			if (result.length) results.push(result);
		}
		if (!isPolygons && results.length) results = results[0];
		else if (!isPolygons && results.length === 0) results = [];
		else if (isPolygons && results.length === 0) results = [
			[]
		];
		return results;
	};
	// Make deep copy of Polygons or Polygon
	// so that also IntPoint objects are cloned and not only referenced
	// This should be the fastest way
	ClipperLib.JS.Clone = function (polygon)
	{
		if (!(polygon instanceof Array)) return [];
		if (polygon.length === 0) return [];
		else if (polygon.length === 1 && polygon[0].length === 0) return [
			[]
		];
		var isPolygons = polygon[0] instanceof Array;
		if (!isPolygons) polygon = [polygon];
		var len = polygon.length,
			plen, i, j, result;
		var results = new Array(len);
		for (i = 0; i < len; i++)
		{
			plen = polygon[i].length;
			result = new Array(plen);
			for (j = 0; j < plen; j++)
			{
				result[j] = {
					X: polygon[i][j].X,
					Y: polygon[i][j].Y
				};

			}
			results[i] = result;
		}
		if (!isPolygons) results = results[0];
		return results;
	};

	// Removes points that doesn't affect much to the visual appearance.
	// If middle point is at or under certain distance (tolerance) of the line segment between
	// start and end point, the middle point is removed.
	ClipperLib.JS.Lighten = function (polygon, tolerance)
	{
		if (!(polygon instanceof Array)) return [];
		if (typeof tolerance !== "number" || tolerance === null)
		{
			ClipperLib.Error("Tolerance is not a number in Lighten().");
			return ClipperLib.JS.Clone(polygon);
		}
		if (polygon.length === 0 || (polygon.length === 1 && polygon[0].length === 0) || tolerance < 0)
		{
			return ClipperLib.JS.Clone(polygon);
		}
		var isPolygons = polygon[0] instanceof Array;
		if (!isPolygons) polygon = [polygon];
		var i, j, poly, k, poly2, plen, A, B, P, d, rem, addlast;
		var bxax, byay, l, ax, ay;
		var len = polygon.length;
		var toleranceSq = tolerance * tolerance;
		var results = [];
		for (i = 0; i < len; i++)
		{
			poly = polygon[i];
			plen = poly.length;
			if (plen === 0) continue;
			for (k = 0; k < 1000000; k++) // could be forever loop, but wiser to restrict max repeat count
			{
				poly2 = [];
				plen = poly.length;
				// the first have to added to the end, if first and last are not the same
				// this way we ensure that also the actual last point can be removed if needed
				if (poly[plen - 1].X !== poly[0].X || poly[plen - 1].Y !== poly[0].Y)
				{
					addlast = 1;
					poly.push(
					{
						X: poly[0].X,
						Y: poly[0].Y
					});
					plen = poly.length;
				}
				else addlast = 0;
				rem = []; // Indexes of removed points
				for (j = 0; j < plen - 2; j++)
				{
					A = poly[j]; // Start point of line segment
					P = poly[j + 1]; // Middle point. This is the one to be removed.
					B = poly[j + 2]; // End point of line segment
					ax = A.X;
					ay = A.Y;
					bxax = B.X - ax;
					byay = B.Y - ay;
					if (bxax !== 0 || byay !== 0) // To avoid Nan, when A==P && P==B. And to avoid peaks (A==B && A!=P), which have lenght, but not area.
					{
						l = ((P.X - ax) * bxax + (P.Y - ay) * byay) / (bxax * bxax + byay * byay);
						if (l > 1)
						{
							ax = B.X;
							ay = B.Y;
						}
						else if (l > 0)
						{
							ax += bxax * l;
							ay += byay * l;
						}
					}
					bxax = P.X - ax;
					byay = P.Y - ay;
					d = bxax * bxax + byay * byay;
					if (d <= toleranceSq)
					{
						rem[j + 1] = 1;
						j++; // when removed, transfer the pointer to the next one
					}
				}
				// add all unremoved points to poly2
				poly2.push(
				{
					X: poly[0].X,
					Y: poly[0].Y
				});
				for (j = 1; j < plen - 1; j++)
					if (!rem[j]) poly2.push(
					{
						X: poly[j].X,
						Y: poly[j].Y
					});
				poly2.push(
				{
					X: poly[plen - 1].X,
					Y: poly[plen - 1].Y
				});
				// if the first point was added to the end, remove it
				if (addlast) poly.pop();
				// break, if there was not anymore removed points
				if (!rem.length) break;
				// else continue looping using poly2, to check if there are points to remove
				else poly = poly2;
			}
			plen = poly2.length;
			// remove duplicate from end, if needed
			if (poly2[plen - 1].X === poly2[0].X && poly2[plen - 1].Y === poly2[0].Y)
			{
				poly2.pop();
			}
			if (poly2.length > 2) // to avoid two-point-polygons
				results.push(poly2);
		}
		if (!isPolygons)
		{
			results = results[0];
		}
		if (typeof (results) === "undefined")
		{
			results = [];
		}
		return results;
	};

	ClipperLib.JS.PerimeterOfPath = function (path, closed, scale)
	{
		if (typeof (path) === "undefined") return 0;
		var sqrt = Math.sqrt;
		var perimeter = 0.0;
		var p1, p2, p1x = 0.0,
			p1y = 0.0,
			p2x = 0.0,
			p2y = 0.0;
		var j = path.length;
		if (j < 2) return 0;
		if (closed)
		{
			path[j] = path[0];
			j++;
		}
		while (--j)
		{
			p1 = path[j];
			p1x = p1.X;
			p1y = p1.Y;
			p2 = path[j - 1];
			p2x = p2.X;
			p2y = p2.Y;
			perimeter += sqrt((p1x - p2x) * (p1x - p2x) + (p1y - p2y) * (p1y - p2y));
		}
		if (closed) path.pop();
		return perimeter / scale;
	};

	ClipperLib.JS.PerimeterOfPaths = function (paths, closed, scale)
	{
		if (!scale) scale = 1;
		var perimeter = 0;
		for (var i = 0; i < paths.length; i++)
		{
			perimeter += ClipperLib.JS.PerimeterOfPath(paths[i], closed, scale);
		}
		return perimeter;
	};

	ClipperLib.JS.ScaleDownPath = function (path, scale)
	{
		var i, p;
		if (!scale) scale = 1;
		i = path.length;
		while (i--)
		{
			p = path[i];
			p.X = p.X / scale;
			p.Y = p.Y / scale;
		}
	};

	ClipperLib.JS.ScaleDownPaths = function (paths, scale)
	{
		var i, j, p;
		if (!scale) scale = 1;
		i = paths.length;
		while (i--)
		{
			j = paths[i].length;
			while (j--)
			{
				p = paths[i][j];
				p.X = p.X / scale;
				p.Y = p.Y / scale;
			}
		}
	};

	ClipperLib.JS.ScaleUpPath = function (path, scale)
	{
		var i, p, round = Math.round;
		if (!scale) scale = 1;
		i = path.length;
		while (i--)
		{
			p = path[i];
			p.X = round(p.X * scale);
			p.Y = round(p.Y * scale);
		}
	};

	ClipperLib.JS.ScaleUpPaths = function (paths, scale)
	{
		var i, j, p, round = Math.round;
		if (!scale) scale = 1;
		i = paths.length;
		while (i--)
		{
			j = paths[i].length;
			while (j--)
			{
				p = paths[i][j];
				p.X = round(p.X * scale);
				p.Y = round(p.Y * scale);
			}
		}
	};

	/**
	* @constructor
	*/
	ClipperLib.ExPolygons = function ()
	{
		return [];
	};
	/**
	* @constructor
	*/
	ClipperLib.ExPolygon = function ()
	{
		this.outer = null;
		this.holes = null;
	};

	ClipperLib.JS.AddOuterPolyNodeToExPolygons = function (polynode, expolygons)
	{
		var ep = new ClipperLib.ExPolygon();
		ep.outer = polynode.Contour();
		var childs = polynode.Childs();
		var ilen = childs.length;
		ep.holes = new Array(ilen);
		var node, n, i, j, childs2, jlen;
		for (i = 0; i < ilen; i++)
		{
			node = childs[i];
			ep.holes[i] = node.Contour();
			//Add outer polygons contained by (nested within) holes ...
			for (j = 0, childs2 = node.Childs(), jlen = childs2.length; j < jlen; j++)
			{
				n = childs2[j];
				ClipperLib.JS.AddOuterPolyNodeToExPolygons(n, expolygons);
			}
		}
		expolygons.push(ep);
	};

	ClipperLib.JS.ExPolygonsToPaths = function (expolygons)
	{
		var a, i, alen, ilen;
		var paths = new ClipperLib.Paths();
		for (a = 0, alen = expolygons.length; a < alen; a++)
		{
			paths.push(expolygons[a].outer);
			for (i = 0, ilen = expolygons[a].holes.length; i < ilen; i++)
			{
				paths.push(expolygons[a].holes[i]);
			}
		}
		return paths;
	};
	ClipperLib.JS.PolyTreeToExPolygons = function (polytree)
	{
		var expolygons = new ClipperLib.ExPolygons();
		var node, i, childs, ilen;
		for (i = 0, childs = polytree.Childs(), ilen = childs.length; i < ilen; i++)
		{
			node = childs[i];
			ClipperLib.JS.AddOuterPolyNodeToExPolygons(node, expolygons);
		}
		return expolygons;
	};

})();
});

var module = createCommonjsModule(function (module, exports) {

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.setErrorCallback = undefined;

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();



var _clipperLib2 = _interopRequireDefault(clipper);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _toConsumableArray(arr) { if (Array.isArray(arr)) { for (var i = 0, arr2 = Array(arr.length); i < arr.length; i++) { arr2[i] = arr[i]; } return arr2; } else { return Array.from(arr); } }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var errorCallback = void 0;
var setErrorCallback = exports.setErrorCallback = function setErrorCallback(callback) {
  errorCallback = callback;
};
_clipperLib2.default.Error = function (message) {
  if (errorCallback) errorCallback(message);
};

var CLIPPER = new _clipperLib2.default.Clipper();
var CLIPPER_OFFSET = new _clipperLib2.default.ClipperOffset();

var Shape = function () {
  function Shape() {
    var paths = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : [];
    var closed = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : true;
    var capitalConversion = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : false;
    var integerConversion = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : false;
    var removeDuplicates = arguments.length > 4 && arguments[4] !== undefined ? arguments[4] : false;

    _classCallCheck(this, Shape);

    this.paths = paths;
    if (capitalConversion) this.paths = this.paths.map(mapLowerToCapital);
    if (integerConversion) this.paths = this.paths.map(mapToRound);
    if (removeDuplicates) this.paths = this.paths.map(filterPathsDuplicates);
    this.closed = closed;
  }

  _createClass(Shape, [{
    key: '_clip',
    value: function _clip(type) {
      var solution = new _clipperLib2.default.PolyTree();

      CLIPPER.Clear();
      CLIPPER.AddPaths(this.paths, _clipperLib2.default.PolyType.ptSubject, this.closed);

      for (var _len = arguments.length, clipShapes = Array(_len > 1 ? _len - 1 : 0), _key = 1; _key < _len; _key++) {
        clipShapes[_key - 1] = arguments[_key];
      }

      for (var i = 0; i < clipShapes.length; i++) {
        var clipShape = clipShapes[i];
        CLIPPER.AddPaths(clipShape.paths, _clipperLib2.default.PolyType.ptClip, clipShape.closed);
      }
      CLIPPER.Execute(type, solution);

      var newShape = _clipperLib2.default.Clipper.PolyTreeToPaths(solution);
      return new Shape(newShape, this.closed);
    }
  }, {
    key: 'union',
    value: function union() {
      for (var _len2 = arguments.length, clipShapes = Array(_len2), _key2 = 0; _key2 < _len2; _key2++) {
        clipShapes[_key2] = arguments[_key2];
      }

      return this._clip.apply(this, [_clipperLib2.default.ClipType.ctUnion].concat(clipShapes));
    }
  }, {
    key: 'difference',
    value: function difference() {
      for (var _len3 = arguments.length, clipShapes = Array(_len3), _key3 = 0; _key3 < _len3; _key3++) {
        clipShapes[_key3] = arguments[_key3];
      }

      return this._clip.apply(this, [_clipperLib2.default.ClipType.ctDifference].concat(clipShapes));
    }
  }, {
    key: 'intersect',
    value: function intersect() {
      for (var _len4 = arguments.length, clipShapes = Array(_len4), _key4 = 0; _key4 < _len4; _key4++) {
        clipShapes[_key4] = arguments[_key4];
      }

      return this._clip.apply(this, [_clipperLib2.default.ClipType.ctIntersection].concat(clipShapes));
    }
  }, {
    key: 'xor',
    value: function xor() {
      for (var _len5 = arguments.length, clipShapes = Array(_len5), _key5 = 0; _key5 < _len5; _key5++) {
        clipShapes[_key5] = arguments[_key5];
      }

      return this._clip.apply(this, [_clipperLib2.default.ClipType.ctXor].concat(clipShapes));
    }
  }, {
    key: 'offset',
    value: function offset(_offset) {
      var options = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};
      var _options$jointType = options.jointType,
          jointType = _options$jointType === undefined ? 'jtSquare' : _options$jointType,
          _options$endType = options.endType,
          endType = _options$endType === undefined ? 'etClosedPolygon' : _options$endType,
          _options$miterLimit = options.miterLimit,
          miterLimit = _options$miterLimit === undefined ? 2.0 : _options$miterLimit,
          _options$roundPrecisi = options.roundPrecision,
          roundPrecision = _options$roundPrecisi === undefined ? 0.25 : _options$roundPrecisi;


      CLIPPER_OFFSET.Clear();
      CLIPPER_OFFSET.ArcTolerance = roundPrecision;
      CLIPPER_OFFSET.MiterLimit = miterLimit;

      var offsetPaths = new _clipperLib2.default.Paths();
      CLIPPER_OFFSET.AddPaths(this.paths, _clipperLib2.default.JoinType[jointType], _clipperLib2.default.EndType[endType]);
      CLIPPER_OFFSET.Execute(offsetPaths, _offset);

      return new Shape(offsetPaths, true);
    }
  }, {
    key: 'scaleUp',
    value: function scaleUp(factor) {
      _clipperLib2.default.JS.ScaleUpPaths(this.paths, factor);

      return this;
    }
  }, {
    key: 'scaleDown',
    value: function scaleDown(factor) {
      _clipperLib2.default.JS.ScaleDownPaths(this.paths, factor);

      return this;
    }
  }, {
    key: 'firstPoint',
    value: function firstPoint() {
      var toLower = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : false;

      if (this.paths.length === 0) {
        return;
      }

      var firstPath = this.paths[0];
      var firstPoint = firstPath[0];
      if (toLower) {
        return vectorToLower(firstPoint);
      } else {
        return firstPoint;
      }
    }
  }, {
    key: 'lastPoint',
    value: function lastPoint() {
      var toLower = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : false;

      if (this.paths.length === 0) {
        return;
      }

      var lastPath = this.paths[this.paths.length - 1];
      var lastPoint = this.closed ? lastPath[0] : lastPath[lastPath.length - 1];
      if (toLower) {
        return vectorToLower(lastPoint);
      } else {
        return lastPoint;
      }
    }
  }, {
    key: 'areas',
    value: function areas() {
      var _this = this;

      var areas = this.paths.map(function (path, i) {
        return _this.area(i);
      });
      return areas;
    }
  }, {
    key: 'area',
    value: function area(index) {
      var path = this.paths[index];
      var area = _clipperLib2.default.Clipper.Area(path);
      return area;
    }
  }, {
    key: 'totalArea',
    value: function totalArea() {
      return this.areas().reduce(function (totalArea, area) {
        return totalArea + area;
      }, 0);
    }
  }, {
    key: 'perimeter',
    value: function perimeter(index) {
      var path = this.paths[index];
      var perimeter = _clipperLib2.default.JS.PerimeterOfPath(path, this.closed, 1);
      return perimeter;
    }
  }, {
    key: 'perimeters',
    value: function perimeters() {
      var _this2 = this;

      return this.paths.map(function (path) {
        return _clipperLib2.default.JS.PerimeterOfPath(path, _this2.closed, 1);
      });
    }
  }, {
    key: 'totalPerimeter',
    value: function totalPerimeter() {
      var perimeter = _clipperLib2.default.JS.PerimeterOfPaths(this.paths, this.closed);
      return perimeter;
    }
  }, {
    key: 'reverse',
    value: function reverse() {
      _clipperLib2.default.Clipper.ReversePaths(this.paths);

      return this;
    }
  }, {
    key: 'thresholdArea',
    value: function thresholdArea(minArea) {
      var _arr = [].concat(_toConsumableArray(this.paths));

      for (var _i = 0; _i < _arr.length; _i++) {
        var path = _arr[_i];
        var area = Math.abs(_clipperLib2.default.Clipper.Area(path));

        if (area < minArea) {
          var index = this.paths.indexOf(path);
          this.paths.splice(index, 1);
        }
      }
      return this;
    }
  }, {
    key: 'join',
    value: function join(shape) {
      var _paths;

      (_paths = this.paths).splice.apply(_paths, [this.paths.length, 0].concat(_toConsumableArray(shape.paths)));

      return this;
    }
  }, {
    key: 'clone',
    value: function clone() {
      return new Shape(_clipperLib2.default.JS.Clone(this.paths), this.closed);
    }
  }, {
    key: 'shapeBounds',
    value: function shapeBounds() {
      return _clipperLib2.default.JS.BoundsOfPaths(this.paths);
    }
  }, {
    key: 'pathBounds',
    value: function pathBounds(index) {
      var path = this.paths[index];

      return _clipperLib2.default.JS.BoundsOfPath(path);
    }
  }, {
    key: 'clean',
    value: function clean(cleanDelta) {
      return new Shape(_clipperLib2.default.Clipper.CleanPolygons(this.paths, cleanDelta), this.closed);
    }
  }, {
    key: 'orientation',
    value: function orientation(index) {
      var path = this.paths[index];
      return _clipperLib2.default.Clipper.Orientation(path);
    }
  }, {
    key: 'pointInShape',
    value: function pointInShape(point) {
      var capitalConversion = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : false;
      var integerConversion = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : false;

      if (capitalConversion) point = vectorToCapital(point);
      if (integerConversion) point = roundVector(point);
      for (var i = 0; i < this.paths.length; i++) {
        var pointInPath = this.pointInPath(i, point);
        var orientation = this.orientation(i);

        if (!pointInPath && orientation || pointInPath && !orientation) {
          return false;
        }
      }

      return true;
    }
  }, {
    key: 'pointInPath',
    value: function pointInPath(index, point) {
      var capitalConversion = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : false;
      var integerConversion = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : false;

      if (capitalConversion) point = vectorToCapital(point);
      if (integerConversion) point = roundVector(point);
      var path = this.paths[index];
      var intPoint = { X: Math.round(point.X), Y: Math.round(point.Y) };

      return _clipperLib2.default.Clipper.PointInPolygon(intPoint, path) > 0;
    }
  }, {
    key: 'fixOrientation',
    value: function fixOrientation() {
      if (!this.closed) {
        return this;
      }

      if (this.totalArea() < 0) {
        this.reverse();
      }

      return this;
    }
  }, {
    key: 'simplify',
    value: function simplify(fillType) {
      if (this.closed) {
        var shape = _clipperLib2.default.Clipper.SimplifyPolygons(this.paths, _clipperLib2.default.PolyFillType[fillType]);
        return new Shape(shape, true);
      } else {
        return this;
      }
    }
  }, {
    key: 'seperateShapes',
    value: function seperateShapes() {
      var shapes = [];

      if (!this.closed) {
        var _iteratorNormalCompletion = true;
        var _didIteratorError = false;
        var _iteratorError = undefined;

        try {
          for (var _iterator = this.paths[Symbol.iterator](), _step; !(_iteratorNormalCompletion = (_step = _iterator.next()).done); _iteratorNormalCompletion = true) {
            var path = _step.value;

            shapes.push(new Shape([path], false));
          }
        } catch (err) {
          _didIteratorError = true;
          _iteratorError = err;
        } finally {
          try {
            if (!_iteratorNormalCompletion && _iterator.return) {
              _iterator.return();
            }
          } finally {
            if (_didIteratorError) {
              throw _iteratorError;
            }
          }
        }
      } else {
        var areas = new WeakMap();
        var outlines = [];
        var holes = [];

        for (var i = 0; i < this.paths.length; i++) {
          var _path = this.paths[i];
          var orientation = this.orientation(i);

          if (orientation) {
            var area = this.area(i);
            areas.set(_path, area);
            outlines.push(_path);
          } else {
            holes.push(_path);
          }
        }

        outlines.sort(function (a, b) {
          return areas.get(a) - areas.get(b);
        });

        var _iteratorNormalCompletion2 = true;
        var _didIteratorError2 = false;
        var _iteratorError2 = undefined;

        try {
          for (var _iterator2 = outlines[Symbol.iterator](), _step2; !(_iteratorNormalCompletion2 = (_step2 = _iterator2.next()).done); _iteratorNormalCompletion2 = true) {
            var outline = _step2.value;

            var shape = [outline];

            var index = this.paths.indexOf(outline);

            var _arr2 = [].concat(holes);

            for (var _i2 = 0; _i2 < _arr2.length; _i2++) {
              var hole = _arr2[_i2];
              var pointInHole = this.pointInPath(index, hole[0]);
              if (pointInHole) {
                shape.push(hole);

                var _index = holes.indexOf(hole);
                holes.splice(_index, 1);
              }
            }

            shapes.push(new Shape(shape, true));
          }
        } catch (err) {
          _didIteratorError2 = true;
          _iteratorError2 = err;
        } finally {
          try {
            if (!_iteratorNormalCompletion2 && _iterator2.return) {
              _iterator2.return();
            }
          } finally {
            if (_didIteratorError2) {
              throw _iteratorError2;
            }
          }
        }
      }

      return shapes;
    }
  }, {
    key: 'round',
    value: function round() {
      return new Shape(this.paths.map(mapToRound), this.closed);
    }
  }, {
    key: 'removeDuplicates',
    value: function removeDuplicates() {
      return new Shape(this.paths.map(filterPathsDuplicates), this.closed);
    }
  }, {
    key: 'mapToLower',
    value: function mapToLower() {
      return this.paths.map(mapCapitalToLower);
    }
  }]);

  return Shape;
}();

exports.default = Shape;


function mapCapitalToLower(path) {
  return path.map(vectorToLower);
}

function vectorToLower(_ref) {
  var X = _ref.X,
      Y = _ref.Y;

  return { x: X, y: Y };
}

function mapLowerToCapital(path) {
  return path.map(vectorToCapital);
}

function vectorToCapital(_ref2) {
  var x = _ref2.x,
      y = _ref2.y;

  return { X: x, Y: y };
}

function mapToRound(path) {
  return path.map(roundVector);
}

function roundVector(_ref3) {
  var X = _ref3.X,
      Y = _ref3.Y;

  return { X: Math.round(X), Y: Math.round(Y) };
}

function filterPathsDuplicates(path) {
  return path.filter(filterPathDuplicates);
}

function filterPathDuplicates(point, i, array) {
  if (i === 0) return true;

  var prevPoint = array[i - 1];
  return !(point.X === prevPoint.X && point.Y === prevPoint.Y);
}
//# sourceMappingURL=index.js.map
});

var Shape = unwrapExports(module);
var module_1 = module.setErrorCallback;

var csg2d = createCommonjsModule(function (module) {
// Constructive Solid Geometry (CSG) is a modeling technique that uses Boolean
// operations like union and intersection to combine 3D solids. This library
// implements CSG operations on 2D polygons elegantly and concisely using BSP trees,
// and is meant to serve as an easily understandable implementation of the
// algorithm.
// 
// Example usage:
// 
//   var subjectPolygon = CSG.fromPolygons([[10, 10], [100, 10], [50, 140]]);
//   var clipPolygon = CSG.fromPolygons([[10, 100], [50, 10], [100, 100]]);
//   var polygons = subjectPolygon.subtract(clipPolygon).toPolygons();
// 
// ## Implementation Details
// 
// All CSG operations are implemented in terms of two functions, `clipTo()` and
// `invert()`, which remove parts of a BSP tree inside another BSP tree and swap
// solid and empty space, respectively. To find the union of `a` and `b`, we
// want to remove everything in `a` inside `b` and everything in `b` inside `a`,
// then combine polygons from `a` and `b` into one solid:
// 
//   a.clipTo(b);
//   b.clipTo(a);
//   a.build(b.allPolygons());
// 
// The only tricky part is handling overlapping coplanar polygons in both trees.
// The code above keeps both copies, but we need to keep them in one tree and
// remove them in the other tree. To remove them from `b` we can clip the
// inverse of `b` against `a`. The code for union now looks like this:
// 
//   a.clipTo(b);
//   b.clipTo(a);
//   b.invert();
//   b.clipTo(a);
//   b.invert();
//   a.build(b.allPolygons());
// 
// Subtraction and intersection naturally follow from set operations. If
// union is `A | B`, subtraction is `A - B = ~(~A | B)` and intersection is
// `A & B = ~(~A | ~B)` where `~` is the complement operator.
// 
// ## License
// 
// Copyright (c) 2011 Evan Wallace (http://madebyevan.com/), under the MIT license.

// # class CSG

// Holds a binary space partition tree representing a 3D solid. Two solids can
// be combined using the `union()`, `subtract()`, and `intersect()` methods.


(function(m) {
  // CommonJS
  {
    console.log("FOOO");
    module.exports = m();
  // Browser
  }
})(function() {

  var CSG = function() {
    this.segments = [];
  };

  CSG.fromSegments = function(segments) {
    var csg = new CSG();
    csg.segments = segments;
    return csg;
  };

  // Construct a CSG solid from a list of `CSG.Polygon` instances.
  CSG.fromPolygons = function(polygons) {
    var csg = new CSG();
    csg.segments = [];
    for (var i = 0; i < polygons.length; i++) {
      for (var j = 0; j < polygons[i].length; j++) {
        var k = (j + 1) % (polygons[i].length);
        csg.segments.push(new CSG.Segment([new CSG.Vector(polygons[i][j]), new CSG.Vector(polygons[i][k])]));
      }
    }
    return csg;
  };

  CSG.prototype = {
    clone: function() {
      var csg = new CSG();
      csg.segments = this.segments.map(function(p) {
        return p.clone();
      });
      return csg;
    },

    toSegments: function() {
      return this.segments;
    },

    toPolygons: function() {
      var segments = this.toSegments();

      var polygons = [];

      var list = segments.slice();

      var findNext = function(extremum) {
        for (var i = 0; i < list.length; i++) {
          if (list[i].vertices[0].squaredLengthTo(extremum) < 1) {
            var result = list[i].clone();
            list.splice(i, 1);
            return result;
          }
        }
        return false;
      };
      var currentIndex = 0;
      while (list.length > 0) {
        polygons[currentIndex] = polygons[currentIndex] || [];
        if (polygons[currentIndex].length == 0) {
          polygons[currentIndex].push(list[0].vertices[0]);
          polygons[currentIndex].push(list[0].vertices[1]);
          list.splice(0, 1);
        }

        var next = findNext(polygons[currentIndex][polygons[currentIndex].length - 1]);
        if (next) {
          polygons[currentIndex].push(next.vertices[1]);
        } else {
          currentIndex++;
        }
      }

      return polygons;
    },

    // Return a new CSG solid representing space in either this solid or in the
    // solid `csg`. Neither this solid nor the solid `csg` are modified.
    // 
    //   A.union(B)
    // 
    //   +-------+      +-------+
    //   |     |      |     |
    //   |   A   |      |     |
    //   |  +--+----+   =   |     +----+
    //   +----+--+  |     +----+     |
    //      |   B   |      |     |
    //      |     |      |     |
    //      +-------+      +-------+
    // 
    union: function(csg) {
      var a = new CSG.Node(this.clone().segments);
      var b = new CSG.Node(csg.clone().segments);
      a.invert();
      b.clipTo(a);
      b.invert();
      a.clipTo(b);
      b.clipTo(a);
      a.build(b.allSegments());
      a.invert();
      return CSG.fromSegments(a.allSegments());
    },


    // Return a new CSG solid representing space in this solid but not in the
    // solid `csg`. Neither this solid nor the solid `csg` are modified.
    // 
    //   A.subtract(B)
    // 
    //   +-------+      +-------+
    //   |     |      |     |
    //   |   A   |      |     |
    //   |  +--+----+   =   |  +--+
    //   +----+--+  |     +----+
    //      |   B   |
    //      |     |
    //      +-------+
    // 
    subtract: function(csg) {
      var b = new CSG.Node(this.clone().segments);
      var a = new CSG.Node(csg.clone().segments);
      a.invert();
      a.clipTo(b);
      b.clipTo(a);
      b.invert();
      b.clipTo(a);
      b.invert();
      a.build(b.allSegments());
      a.invert();
      return CSG.fromSegments(a.allSegments()).inverse();
    },

    // Return a new CSG solid representing space both this solid and in the
    // solid `csg`. Neither this solid nor the solid `csg` are modified.
    // 
    //   A.intersect(B)
    // 
    //   +-------+
    //   |     |
    //   |   A   |
    //   |  +--+----+   =   +--+
    //   +----+--+  |     +--+
    //      |   B   |
    //      |     |
    //      +-------+
    // 
    intersect: function(csg) {
      var a = new CSG.Node(this.clone().segments);
      var b = new CSG.Node(csg.clone().segments);
      a.clipTo(b);
      b.clipTo(a);
      b.invert();
      b.clipTo(a);
      b.invert();
      a.build(b.allSegments());
      return CSG.fromSegments(a.allSegments());
    },

    // Return a new CSG solid with solid and empty space switched. This solid is
    // not modified.
    inverse: function() {
      var csg = this.clone();
      csg.segments.map(function(p) {
        p.flip();
      });
      return csg;
    }
  };

  // # class Vector

  // Represents a 3D vector.
  // 
  // Example usage:
  // 
  //   new CSG.Vector(1, 2);
  //   new CSG.Vector([1, 2]);
  //   new CSG.Vector({ x: 1, y: 2 });

  CSG.Vector = function(x, y) {
    if (arguments.length == 2) {
      this.x = x;
      this.y = y;
    } else if ('x' in x) {
      this.x = x.x;
      this.y = x.y;
    } else {
      this.x = x[0];
      this.y = x[1];
    }
  };

  CSG.Vector.prototype = {
    clone: function() {
      return new CSG.Vector(this.x, this.y);
    },

    negated: function() {
      return new CSG.Vector(-this.x, -this.y);
    },

    plus: function(a) {
      return new CSG.Vector(this.x + a.x, this.y + a.y);
    },

    minus: function(a) {
      return new CSG.Vector(this.x - a.x, this.y - a.y);
    },

    times: function(a) {
      return new CSG.Vector(this.x * a, this.y * a);
    },

    dividedBy: function(a) {
      return new CSG.Vector(this.x / a, this.y / a);
    },

    dot: function(a) {
      return this.x * a.x + this.y * a.y;
    },

    lerp: function(a, t) {
      return this.plus(a.minus(this).times(t));
    },

    length: function() {
      return Math.sqrt(this.dot(this));
    },

    unit: function() {
      return this.dividedBy(this.length());
    },

    squaredLengthTo: function(b) {
      return (this.x - b.x) * (this.x - b.x) + (this.y - b.y) * (this.y - b.y);
    }
  };

  // # class line

  CSG.Line = function(origin, direction) {
    this.origin = origin;
    this.direction = direction;
    this.normal = (new CSG.Vector(this.direction.y, -this.direction.x));
  };

  CSG.Line.EPSILON = 1e-5;

  CSG.Line.fromPoints = function(a, b) {
    var dir = b.minus(a).unit();
    return new CSG.Line(a, dir);
  };

  CSG.Line.prototype = {
    clone: function() {
      return new CSG.Line(this.origin.clone(), this.direction.clone());
    },

    flip: function() {
      this.direction = this.direction.negated();
      this.normal = this.normal.negated();
    },

    // Split `segment` by this line if needed, then put the segment or segment
    // fragments in the appropriate lists. Colinear segments go into either
    // `colinearRight` or `colinearLeft` depending on their orientation with
    // respect to this line. segments in right or in left of this line go into
    // either `right` or `left`.
    splitSegment: function(segment, colinearRight, colinearLeft, right, left) {
      var COLINEAR = 0;
      var RIGHT = 1;
      var LEFT = 2;
      var SPANNING = 3;

      // Classify each point as well as the entire polygon into one of the above
      // four classes.
      var segmentType = 0;
      var types = [];
      for (var i = 0; i < segment.vertices.length; i++) {
        var t = this.normal.dot(segment.vertices[i].minus(this.origin));
        var type = (t < -CSG.Line.EPSILON) ? RIGHT : (t > CSG.Line.EPSILON) ? LEFT : COLINEAR;
        segmentType |= type;
        types.push(type);
      }

      // Put the segment in the correct list, splitting it when necessary.
      switch (segmentType) {
        case COLINEAR:
          if (t != 0) {
            (t > 0 ? colinearRight : colinearLeft).push(segment);
          } else {
            if (segment.line.origin.x < this.origin.x) {
              colinearLeft.push(segment);
            } else {
              colinearRight.push(segment);
            }
          }
          break;
        case RIGHT:
          right.push(segment);
          break;
        case LEFT:
          left.push(segment);
          break;
        case SPANNING: //TODO
          var r = [],
            l = [];
          var ti = types[0],
            tj = types[1];
          var vi = segment.vertices[0],
            vj = segment.vertices[1];
          if (ti == RIGHT && tj == RIGHT) {
            r.push(vi);
            r.push(vj);
          }
          if (ti == LEFT && tj == LEFT) {
            l.push(vi);
            l.push(vj);
          }
          if (ti == RIGHT && tj == LEFT) {
            var t = (this.normal.dot(this.origin.minus(vi))) / this.normal.dot(vj.minus(vi));
            var v = vi.lerp(vj, t);
            r.push(vi);
            r.push(v);
            l.push(v.clone());
            l.push(vj);
          }
          if (ti == LEFT && tj == RIGHT) {
            var t = (this.normal.dot(this.origin.minus(vi))) / this.normal.dot(vj.minus(vi));
            var v = vi.lerp(vj, t);
            l.push(vi);
            l.push(v);
            r.push(v.clone());
            r.push(vj);
          }
          if (r.length >= 2) {
            right.push(new CSG.Segment(r, segment.shared));
          }

          if (l.length >= 2) {
            left.push(new CSG.Segment(l, segment.shared));
          }
          break;
      }
    }
  };

  // # class Segment

  // Represents a convex segment. The vertices used to initialize a segment must
  // be coplanar and form a convex loop. They do not have to be `CSG.Vertex`
  // instances but they must behave similarly (duck typing can be used for
  // customization).
  // 
  // Each convex segment has a `shared` property, which is shared between all
  // segments that are clones of each other or were split from the same segment.
  // This can be used to define per-segment properties (such as surface color).

  CSG.Segment = function(vertices, shared) {
    this.vertices = vertices;
    this.shared = shared;
    this.line = CSG.Line.fromPoints(vertices[0], vertices[1]);
  };

  CSG.Segment.prototype = {
    clone: function() {
      var vertices = this.vertices.map(function(v) {
        return v.clone();
      });
      return new CSG.Segment(vertices, this.shared);
    },

    flip: function() {
      this.vertices.reverse().map(function(v) {
        v.negated();
      });
      this.line.flip();
    }
  };

  // # class Node

  // Holds a node in a BSP tree. A BSP tree is built from a collection of polygons
  // by picking a polygon to split along. That polygon (and all other coplanar
  // polygons) are added directly to that node and the other polygons are added to
  // the right and/or left subtrees. This is not a leafy BSP tree since there is
  // no distinction between internal and leaf nodes.

  CSG.Node = function(segments) {
    this.line = null;
    this.right = null;
    this.left = null;
    this.segments = [];
    if (segments) this.build(segments);
  };

  CSG.Node.prototype = {
    clone: function() {
      var node = new CSG.Node();
      node.line = this.line && this.line.clone();
      node.right = this.right && this.right.clone();
      node.left = this.left && this.left.clone();
      note.segments = this.segments.map(function(p) {
        return p.clone();
      });
      return node;
    },

    // Convert solid space to empty space and empty space to solid space.
    invert: function() {
      for (var i = 0; i < this.segments.length; i++) {
        this.segments[i].flip();
      }
      this.line.flip();
      if (this.right) this.right.invert();
      if (this.left) this.left.invert();
      var temp = this.right;
      this.right = this.left;
      this.left = temp;
    },

    // Recursively remove all segments in `segments` that are inside this BSP
    // tree.

    clipSegments: function(segments) {
      if (!this.line) return segments.slice();
      var right = [],
        left = [];
      for (var i = 0; i < segments.length; i++) {
        this.line.splitSegment(segments[i], right, left, right, left);
      }
      if (this.right) right = this.right.clipSegments(right);
      if (this.left) left = this.left.clipSegments(left);
      else left = [];
      return right.concat(left);
    },

    // Remove all segments in this BSP tree that are inside the other BSP tree
    // `bsp`.
    clipTo: function(bsp) {
      this.segments = bsp.clipSegments(this.segments);
      if (this.right) this.right.clipTo(bsp);
      if (this.left) this.left.clipTo(bsp);
    },

    // Return a list of all segments in this BSP tree.
    allSegments: function() {
      var segments = this.segments.slice();
      if (this.right) segments = segments.concat(this.right.allSegments());
      if (this.left) segments = segments.concat(this.left.allSegments());
      return segments;
    },

    // Build a BSP tree out of `segments`. When called on an existing tree, the
    // new segments are filtered down to the bottom of the tree and become new
    // nodes there. Each set of segments is partitioned using the first polygon
    // (no heuristic is used to pick a good split).
    build: function(segments) {
      if (!segments.length) return;
      if (!this.line) this.line = segments[0].line.clone();
      var right = [],
        left = [];
      for (var i = 0; i < segments.length; i++) {
        this.line.splitSegment(segments[i], this.segments, this.segments, right, left);
      }
      if (right.length) {
        if (!this.right) this.right = new CSG.Node();
        this.right.build(right);
      }
      if (left.length) {
        if (!this.left) this.left = new CSG.Node();
        this.left.build(left);
      }
    }
  };

  return CSG;
});
});

var MAX_HOLE_LEN = 16;

const PLANE = new Plane();
const POINT = new Vector3();
const A = new Vector3();
const B = new Vector3();
const C = new Vector3();

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

   static planeFromCoplarVertexIndices(vertices, i, i2, i3) {
        i*=3;
        i2*=3;
        i3*=3;
        A.set(vertices[i], vertices[i+1], vertices[i+2]);
        B.set(vertices[i2], vertices[i2+1], vertices[i2+2]);
        C.set(vertices[i3], vertices[i3+1], vertices[i3+2]);
        return PLANE.fromCoplanarPoints(A, B, C);
   }

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
        transformId++;

        const vertices = collector.vertices;
        const indices = collector.indices;
        const normals = collector.normals;
        let vi = vertices.length;
        let vc = vi / 3;
        let ii = indices.length;
        let ni = vi;

        let nx;
        let nz;
        let dn;

        let len = polygons.length;
        const defaultExtrudeParams = {
            yBottom: yBottom,
            yBottomMin: yBottomMin,
            yVal: yVal
        };
        let extrudeParams;

        // to map extrudeParams to a map of vertex ids to extrusion vertex ids
        let profile;
        let profileMap = new Map();

        const faceIndices = [];
        let fi = 0;
        let edge;
        let targYBottom;

        for (let i=0; i<len; i++) {
            let polygon = polygons[i];
            edge = polygon.edge;

            fi = 0;
            extrudeParams = !polygon.yExtrudeParams ? defaultExtrudeParams : polygon.yExtrudeParams;
            if (profileMap.has(extrudeParams)) {
                profile = profileMap.get(extrudeParams);
            } else {
                profileMap.set(extrudeParams, profile=new Map());
            }

            let absoluteYRange = typeof extrudeParams.yBottom === "number";
            let considerEdges = yVal !== 0 || (absoluteYRange || yBottom);

            let edgeIndex = 0;
            do {
                if (edge.vertex.transformId !== transformId && !extrudeParams.bordersOnly) {
                    edge.vertex.id = vc++;
                    vertices[vi++] = edge.vertex.x * xzScale;
                    vertices[vi++] = absoluteYRange ? extrudeParams.yVal : edge.vertex.y;
                    vertices[vi++] = edge.vertex.z * xzScale;
                    normals[ni++] = 0;
                    normals[ni++] = 1;
                    normals[ni++] = 0;
                    edge.vertex.transformId = transformId;
                }

                faceIndices[fi++]  = edge.vertex.id;

                ///*
                if (!extrudeParams.bordersOnly && extrudeParams.yBottom !== true && !profile.has(edge.vertex.id)) {
                    profile.set(edge.vertex.id, vc++);
                    vertices[vi++] = edge.vertex.x * xzScale;
                    targYBottom = absoluteYRange ? extrudeParams.yBottom : extrudeParams.yBottom === true ? extrudeParams.yVal : edge.vertex.y - extrudeParams.yVal;
                    vertices[vi++] = extrudeParams.yBottomMin === undefined ? targYBottom : Math.max(extrudeParams.yBottomMin, targYBottom);
                    vertices[vi++] = edge.vertex.z * xzScale;

                    normals[ni++] = 0;
                    normals[ni++] = -1;
                    normals[ni++] = 0;
                }
                //*/

                if (!extrudeParams.bordersOnly ? edge.twin === null && considerEdges : (polygon.edgeMask & (1<<edgeIndex)) ) {
                    ///*
                    let a;
                    let b;
                    let c;
                    let d;
                    // tri 1
                    targYBottom = absoluteYRange ? extrudeParams.yBottom : extrudeParams.yBottom === true ? extrudeParams.yVal : edge.prev.vertex.y - extrudeParams.yVal;
                    indices[ii++] = a = vc++;
                    vertices[vi++] = edge.prev.vertex.x * xzScale;
                    vertices[vi++] = extrudeParams.yBottomMin === undefined ? targYBottom : Math.max(extrudeParams.yBottomMin, targYBottom);
                    vertices[vi++] = edge.prev.vertex.z * xzScale;
                    nx = -edge.prev.vertex.z;
                    nz = edge.prev.vertex.x;
                    dn = Math.sqrt(nx*nx + nz*nz);
                    nx /= dn;
                    nz /= dn;
                    normals[ni++] = nx;
                    normals[ni++] = 0;
                    normals[ni++] = nz;

                    targYBottom = absoluteYRange ? extrudeParams.yBottom : extrudeParams.yBottom === true ? extrudeParams.yVal : edge.vertex.y - extrudeParams.yVal;
                    indices[ii++] = b = vc++;
                    vertices[vi++] = edge.vertex.x * xzScale;
                    vertices[vi++] = extrudeParams.yBottomMin === undefined ? targYBottom : Math.max(extrudeParams.yBottomMin, targYBottom);
                    vertices[vi++] = edge.vertex.z * xzScale;
                    nx = -edge.vertex.z;
                    nz = edge.vertex.x;
                    dn = Math.sqrt(nx*nx + nz*nz);
                    nx /= dn;
                    nz /= dn;
                    normals[ni++] = nx;
                    normals[ni++] = 0;
                    normals[ni++] = nz;

                    // top right
                    indices[ii++] = c = vc++;
                    vertices[vi++] = edge.vertex.x * xzScale;
                    vertices[vi++] = edge.vertex.y;
                    vertices[vi++] = edge.vertex.z * xzScale;
                    normals[ni++] = nx;
                    normals[ni++] = 0;
                    normals[ni++] = nz;

                    // top left
                    d = vc++;
                    vertices[vi++] = edge.prev.vertex.x * xzScale;
                    vertices[vi++] = edge.prev.vertex.y;
                    vertices[vi++] = edge.prev.vertex.z * xzScale;
                    nx = -edge.prev.vertex.z;
                    nz = edge.prev.vertex.x;
                    dn = Math.sqrt(nx*nx + nz*nz);
                    nx /= dn;
                    nz /= dn;
                    normals[ni++] = nx;
                    normals[ni++] = 0;
                    normals[ni++] = nz;

                    // tri2
                    indices[ii++] = a;
                    indices[ii++] = c;
                    indices[ii++] = d;
                   // */
                }

                edge = edge.next;
                edgeIndex++;
            } while(edge !== polygon.edge)

            // set up upper top face indices
            let fLen = fi - 1;
            for (let f=1; f< fLen; f++) {
                indices[ii++] = faceIndices[0];
                indices[ii++] = faceIndices[f];
                indices[ii++] = faceIndices[f+1];
            }

            // set up lower bottom face indices if needed
            ///*
            if (!extrudeParams.bordersOnly && extrudeParams.yBottom !== true) {
                for (let f=1; f< fLen; f++) {
                    indices[ii++] = profile.get(faceIndices[f+1]);
                    indices[ii++] = profile.get(faceIndices[f]);
                    indices[ii++] = profile.get(faceIndices[0]);
                }
            }
            //*/
        }

        return collector;
    }


     /**
     *
     * @param {HalfEdge} edge A HalfEdge to extrude from (using facing "normal", inwards for HalfEdge)
     * @param {Number} extrudeVal How much to extrude from in negative/positive direction
     * kiv open border parameter
     * @return The sepearte newly-created polygon formed as a result of the extruded edge
     */
    static getNewExtrudeEdgePolygon(edge, extrudeVal, keepVertices=false) {
        let dx = edge.vertex.x - edge.prev.vertex.x;
        let dz = edge.vertex.z - edge.prev.vertex.z;
        let nx = -dz;
        let nz = dx;
        let d = Math.sqrt(nx*nx + nz*nz);
        nx /=d;
        nz /=d;
        let contours = [
            (keepVertices ? edge.prev.vertex : edge.prev.vertex.clone()),
            new Vector3(edge.prev.vertex.x + extrudeVal * nx, edge.prev.vertex.y, edge.prev.vertex.z+  extrudeVal * nz),
            new Vector3(edge.vertex.x + extrudeVal * nx, edge.vertex.y, edge.vertex.z + extrudeVal* nz),
            (keepVertices ? edge.vertex : edge.vertex.clone())
        ];
        return new Polygon().fromContour(contours);
    }

    /**
     * Clones a polygon entirely with an entir enew set of HalfEdges and vertex references
     * @param {Polygon} polygon
     */
    static clonePolygon(polygon, reversed=false) {
        let contours = [];
        let edge = polygon.edge;
        do {
            contours.push(edge.vertex.clone());
            edge = edge.next;
        } while (edge !== polygon.edge);

        if (reversed) contours.reverse();
        return new Polygon().fromContour(contours);
    }

    static countBorderEdges(polygon, countAllEdgeTypes=false) {
        let count = 0;
        let edge = polygon.edge;
        do {
            count += !edge.twin || countAllEdgeTypes ? 1 : 0;
            edge = edge.next;
        } while (edge !== polygon.edge);
        return count;
    }

    static getBorderEdges(polygon) {
        let arr = [];
        let edge = polygon.edge;
        do {
            if (!edge.twin) arr.push(edge);
            edge = edge.next;
        } while (edge !== polygon.edge);
        return arr;
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


            contours[c++] = edge.prev.vertex;
             contours[c++] = connector.vertex;
              contours[c++] = connector.prev.vertex;
               contours[c++] = edge.vertex;


            let p;
            contours.length = c;
            polies.push(p = new Polygon().fromContour(contours));

            edge.twin = p.edge.prev;
            p.edge.prev.twin = edge;

            p.edge.prev.twin = connector;
            connector.twin = p.edge.prev;

            if (connector2 !== null) {
                let p2;
                c =0;
                POINT.x = (connector2.prev.vertex.x + connector2.vertex.x) * 0.5;
                POINT.z = (connector2.prev.vertex.z + connector2.vertex.z) * 0.5;
                edge = NavMeshUtils.getClosestBorderEdgeCenterToPoint(connector3Arr, POINT);


                contours[c++] = edge.prev.vertex;
                 contours[c++] = connector2.vertex;
                  contours[c++] = connector2.prev.vertex;
                  contours[c++] = edge.vertex;

                contours.length = c;
                polies.push(p2 =  new Polygon().fromContour(contours));

                edge.twin = p.edge.prev;
                 p.edge.prev.twin = edge;

                p2.edge.prev.twin = connector2;
                connector2.twin = p2.edge.prev;
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
                let v;
                if (vertexMap.has(edge.vertex)) {
                    v = vertexMap.get(edge.vertex);
                } else {
                    v = edge.vertex.clone();
                    vertexMap.set(edge.vertex, v);
                }
                if (clonePolygons) {
                    contours[c++] = v;
                } else {
                    if (clonePolygons !== null) edge.vertex = v;
                }
                edge = edge.next;
            } while (edge !== polygon.edge);

            if (clonePolygons) {
                contours.length = c;
                let poly;
                filteredPolygons.push(poly = new Polygon().fromContour(contours));
                if (polygon.yExtrudeParams !== undefined) poly.yExtrudeParams = polygon.yExtrudeParams;
                if (polygon.edgeMask !== undefined) poly.edgeMask = polygon.edgeMask;
                if (polygon.sep !== undefined) poly.sep = polygon.sep;
                poly.mask = polygon.mask;
            } else filteredPolygons.push(polygon);
        }
        return filteredPolygons;
    }

    static adjustAltitudeOfAllPolygons(polygons, altitude) {
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

    static seperateMarkedPolygonsVertices(polygons) {
        let len = polygons.length;
        for (let i=0;i<len; i++) {
            let polygon = polygons[i];
            if (!polygon.sep) continue;
            let edge = polygon.edge;
            do {
                edge.vertex = edge.vertex.clone();
                edge = edge.next;
            } while (edge !== polygon.edge)
        }
        return polygons;
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

const lineSegment$2 = new LineSegment();
const pointOnLineSegment$2 = new Vector3();

const WALL_RADIUS = 1;

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
const BIT_WARD_ROAD_OUTER = 8;
// const BIT_INNER_ROAD = 4;


/*
For Kralchester3D

SVGCityReader identify:

( // kiv later)
- addConnectingPortal(subjectEdge, connectingEdge, setTwinLinks?=false)

*/


function svgLineFromTo(from, to) {
	return "M"+from.x + ","+from.z + "L" + to.x + ","+to.z;
}

function getNewGeometryCollector() {
	return {
		vertices: [],
		indices: [],
		normals: []
	}
}

/**
 *
 * @param {NavMesh} navmesh
 * @param {Vector3} pt
 * @param {Number} mask
 */
function navmeshTagRegionByPt(navmesh, pt, mask=null, errors, lenient=false) {
	let r = navmesh.getRegionForPoint(pt);
	if (r) {
		if (mask !== null) r.mask = mask;
		pt.region = r;
	} else {
		if (lenient) {
			if (lenient !== true) {
				r = lenient(r);
			}
			else r = navmesh.getClosestRegion(pt);
			if (r) {
				if (mask !== null) r.mask = mask;
				pt.region = r;
				return r;
			}
		}
		if (!errors) errors = [];
		console.warn("navmeshTagRegionByPt couldn't find region:", pt, mask);
		errors.push(pt);
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

function pointToShapePt(pt) {
	return {X:pt[0], Y:pt[1]};
}

function withinVincityOfPointSet(pt, points, dist) {
	dist *= dist;
	let len = points.length;
	for (let i=0; i<len; i++) {
		let p = points[i];
		let dx = p.x - pt.x;
		let dz = p.z - pt.z;
		if (dx*dx + dz*dz <=dist) {
			return true;
		}
	}
	return false;
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

function segPointToVector3(a) {
	return new Vector3(a[0], 0, a[1]);
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
		lineSegment$2.set(edge.prev.vertex, edge.vertex);
		let t = lineSegment$2.closestPointToPointParameter( point, true);
		lineSegment$2.at( t, pointOnLineSegment$2 );
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
		lineSegment$2.set(edge.prev.vertex, edge.vertex);
		let t = lineSegment$2.closestPointToPointParameter( point, true);
		lineSegment$2.at( t, pointOnLineSegment$2 );
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

		this.selectorPlaza = "g[fill-rule='nonzero'][fill='#99948A'][stroke='#1A1917'][stroke-width='0.09999999999999999']";

		this.selectorFarmhouses = "g[fill-rule='nonzero'][stroke='#99948A'][stroke-linecap='butt']";

		this.selectorRoads = "g[fill=none]";  // polyline

		this.aabb2d = new AABB();


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
		this.extrudeCityWallTowerWall = 0.8;

		this.onlyElevateRoadsWithinWalls = false;

		this.detectCityWallEntranceTowersDist = 3;

		// Road detection/heuristic settings
		this.maxRoadEdgeLength = 8; //8;
		this.highwayMinWidth = 1.8;
		this.highwayMaxWidth = 6.2;
		this.optimalHighwayThickness = 2.0;
		this.streetIdPrecision = 0;

		this.detectRampConnectMaxDist = 8;
		this.detectHighwayConnectMaxDist = 5;
		this.detectRoadConnectMaxDist = 8;

		this.highwayMinRampBorderLength = 5;
		this.highwayPerchNoRampLength = 2.7;
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

		// Altitude settings (in intended export 3D scale values)
		this.cityWallTowerTopAltitude = 19.5;
		this.cityWallAltitude = 16;
		this.cityWallTowerBaseAltitude = 14;
		this.highwayAltitude = 12;
		this.wardRoadAltitude = 3;
		this.outerRoadAltitude = 0;
		// this.innerWardRoadAltitude = 0;
		this.innerWardAltitude = 0;

		this.cityWallCeilThickness = 1;
		// extude thickness, if negative value, will sink into ground exclude bottom base faces
		this.cityWallEntranceExtrudeThickness = 1.4;
		this.highwayExtrudeThickness = 3;
		this.wardRoadExtrudeThickness = 0.7;
		this.outerRoadExtrudeThickness = 0;
		this.rampedBuildingExtrudeThickness = -1;

		this.buildingMinHeight = 3;
		this.buildingMaxHeight = 7;


		// Export 3d scale settings
		this.exportScaleXZ = 4;

		// Building roofings
		this.roofMethod = SVGCityReader.buildBasicQuadRoofs;
		this.roofApexHeight = 3.2;
		this.quadRoofChance = 1;

		// Building filtering export settings
		this.minBuildingEdges = 3;	// >=4 to be considered
		this.maxBuildingEdges = 3; // >=4 to be considered
		this.minBuildingEdgeLength = 0;
		this.maxBuildingEdgeLength = 0; // >0 to be considered

		this.smallenBuildingEdgeLength = 0; // >0 to be considered
		this.largenBuildingEdgeLength = 0; // >0 to be considered
		this.smallenSqRootAreaTest = 0;
		this.largenSqRootAreaTest= 0;
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
		} else {
			tempContainer = $(document.body).append($("<div></div>"));
		}

		let dummySelector = $("<g></g>");
		if (this.selectorRoads) {
			// kiv v2
			this.selectorRoads = map.children(this.selectorRoads);
		}

		if (this.selectorFarmhouses) {
			// kiv v2
			this.selectorFarmhouses = map.children(this.selectorFarmhouses);
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
				this.prepareCityWallExtraPolygons();
			} else {
				console.warn("Could not find City/Citadel wall selector!");
			}

		}


		if (this.selectorCitadel) {
			this.selectorCitadel = map.children(this.selectorCitadel);
			if (this.selectorCitadel.length) {
				this.parseCitadel(this.selectorCitadel);
			} else {
				console.warn("JSelector Citadel not found!");
			}
		}

		if (this.selectorLandmark) {
			this.selectorLandmark = map.children(this.selectorLandmark);
			if (this.selectorLandmark.length) {
				if (this.selectorLandmark.length >= 2) ;

				this.parseLandmark(this.selectorLandmark);
			} else {
				console.warn("JSelector Landmark not found!");
			}
		}

		if (this.selectorPlaza) {
			this.selectorPlaza = map.children(this.selectorPlaza);
			//alert(this.selectorPlaza.length);
			this.parsePlaza(this.selectorPlaza);
		}

		if (this.selectorWards) {
			this.selectorWards = map.children(this.selectorWards);
			if (this.selectorCitadel) this.selectorWards = this.selectorWards.not(this.selectorCitadel);
			if (this.selectorLandmark) this.selectorWards = this.selectorWards.not(this.selectorLandmark);
			//if (this.selectorRoads) this.selectorWards = this.selectorWards.not(this.selectorRoads);
			//if (this.selectorFarmhouses) this.selectorWards = this.selectorWards.not(this.selectorFarmhouses);

			this.parseWards(this.selectorWards);

			/*
			this.rampedBuildings = new Map();
			let testBuilding = this.wards[14].neighborhoodPts[0][0];
			this.rampedBuildings.set(testBuilding, this.testSubdivideBuilding(testBuilding));
			*/
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

	getNavmeshExtrudedGeometry() {
		/*
		CITY WALL
		HIGHWAYS*
		UPPER ROADS*
		RAMPS (3D built from SVGCityReader)
		*/

		let deployGeom = {};
		let navmesh;
		let gLevel  = this.innerWardAltitude;
		if (this.navmeshCityWall) {
			// City Wall
			deployGeom.cityWall = NavMeshUtils.collectExtrudeGeometry(getNewGeometryCollector(),NavMeshUtils.seperateMarkedPolygonsVertices(this.navmeshCityWall.regions), gLevel, this.exportScaleXZ, true, gLevel);
			// City wall towers
			if (this.cityWallTowerCeilingPolies) {
				deployGeom.cityWallTowerCeiling = NavMeshUtils.collectExtrudeGeometry(getNewGeometryCollector(), NavMeshUtils.seperateMarkedPolygonsVertices(this.cityWallTowerCeilingPolies), this.cityWallCeilThickness, this.exportScaleXZ);
			}
			if (this.cityWallTowerWallPolies) {
				let towerDownTo = this.cityWallTowerBaseAltitude >= 0 ? this.cityWallTowerBaseAltitude : gLevel;
				let towerUpTo = this.cityWallTowerTopAltitude;
				deployGeom.cityWallTowerWall = NavMeshUtils.collectExtrudeGeometry(getNewGeometryCollector(), NavMeshUtils.seperateMarkedPolygonsVertices(this.cityWallTowerWallPolies), towerUpTo, this.exportScaleXZ, towerDownTo);
			}
		}

		if (this.navmeshRoad) {
			// Highways
			navmesh = new NavMesh();
			navmesh.attemptBuildGraph = false;
			navmesh.attemptMergePolies = false;
			navmesh.fromPolygons(NavMeshUtils.seperateMarkedPolygonsVertices(NavMeshUtils.filterOutPolygonsByMask(this.navmeshRoad.regions, BIT_HIGHWAY, true)));
			deployGeom.highways = NavMeshUtils.collectExtrudeGeometry(getNewGeometryCollector(), navmesh.regions,
				this.highwayExtrudeThickness >= 0 ? this.highwayExtrudeThickness : this.innerWardAltitude, this.exportScaleXZ, this.highwayExtrudeThickness < 0, this.innerWardRoadAltitude);
			// Upper Roads within walls
			navmesh = new NavMesh();
			navmesh.attemptBuildGraph = false;
			navmesh.attemptMergePolies = false;
			navmesh.fromPolygons(NavMeshUtils.seperateMarkedPolygonsVertices(NavMeshUtils.filterOutPolygonsByMask(this.navmeshRoad.regions, BIT_WARD_ROAD, true)));
			deployGeom.wardRoads = NavMeshUtils.collectExtrudeGeometry(getNewGeometryCollector(), navmesh.regions,
				this.wardRoadExtrudeThickness >= 0 ? this.wardRoadExtrudeThickness : this.innerWardAltitude, this.exportScaleXZ, this.wardRoadExtrudeThickness < 0, this.innerWardRoadAltitude);

			// Outer roads outside walls
			navmesh = new NavMesh();
			navmesh.attemptBuildGraph = false;
			navmesh.attemptMergePolies = false;
			navmesh.fromPolygons(NavMeshUtils.seperateMarkedPolygonsVertices(NavMeshUtils.filterOutPolygonsByMask(this.navmeshRoad.regions, BIT_WARD_ROAD_OUTER, true)));
			deployGeom.wardRoadsOuter = NavMeshUtils.collectExtrudeGeometry(getNewGeometryCollector(), navmesh.regions,
			this.outerRoadExtrudeThickness >= 0 ? this.outerRoadExtrudeThickness : this.innerWardAltitude, this.exportScaleXZ, this.outerRoadExtrudeThickness < 0, this.innerWardRoadAltitude);
		}

		if (this.rampedBuildings) {
			let rampedBuildingNavmeshes = this.rampedBuildings.values();
			deployGeom.rampedBuildings = [];

			for (let mesh of rampedBuildingNavmeshes) {
				NavMeshUtils.seperateMarkedPolygonsVertices(mesh.regions);
				deployGeom.rampedBuildings.push(
					NavMeshUtils.collectExtrudeGeometry(getNewGeometryCollector(), mesh.regions,
					this.rampedBuildingExtrudeThickness >= 0 ? this.rampedBuildingExtrudeThickness : this.innerWardAltitude, this.exportScaleXZ, this.rampedBuildingExtrudeThickness < 0, this.innerWardAltitude)
				);
			}
		}
		return deployGeom;
	}


	getNeighborhoodHullsGeometry() {
		const collector = getNewGeometryCollector();
		const gLevel = this.innerWardAltitude;
		const scaleXZ = this.exportScaleXZ;

		this.wards.forEach((wardObj)=> {
			wardObj.neighborhoodHulls.forEach((hull)=> {
				let bLen = hull.length - 1;
				let wv = collector.vertices.length / 3;
				hull.forEach((pt, i)=> {
					//let prevIndex = i >= 1 ? i - 1 : bLen;
					//let prevPt = hull[prevIndex];

					let nextIndex = i < bLen ? i + 1 : 0;
					let nextPt = hull[nextIndex];
					collector.vertices.push(pt[0]*scaleXZ, gLevel, pt[1]*scaleXZ);
					collector.normals.push(0, 1, 0);
					if (i >= 1 && i < bLen) {
						collector.indices.push(wv, wv+i, wv+i+1);
					}
				});

			});
		});
		return collector;
	}

	buildGroundNavmesh(inset=0) {
		// assumed only City wall and Buildings Blocks ground surface
		if (!this.profileWardBuildings) {
			alert('buildGroundNavmesh failed, please call getWardBuildingsGeometry() first!');
			return;
		}

		const scaleXZ = this._PREVIEW_MODE ? 1 : this.exportScaleXZ;
		const previewMult = this._PREVIEW_MODE ? 1/this.exportScaleXZ : 1;
		var points = [
			[-this.svgWidth*.5*scaleXZ, -this.svgHeight*.5*scaleXZ],
			[this.svgWidth*.5*scaleXZ, -this.svgHeight*.5*scaleXZ],
			[this.svgWidth*.5*scaleXZ, this.svgHeight*.5*scaleXZ],
			[-this.svgWidth*.5*scaleXZ, this.svgHeight*.5*scaleXZ]
		];
		var canvasSubject = new Shape([points.map(pointToShapePt)]);
		
		var edges = [
			[0,1], [1,2], [2,3], [3,0]
		];
		const pointsList = [];
	

		// assumed buildings are non-intersecting
		
		this.profileWardBuildings.forEach((ward)=> {
			ward.forEach((b)=> {
				let buildingPoints = [];
				pointsList.push(buildingPoints);

				let len = b.length;
				let i = 0;
				let bi = points.length;
				points.push([b[i]*previewMult, b[i+1]*previewMult]);
				buildingPoints.push([b[i]*previewMult, b[i+1]*previewMult]);
				for (i=2; i<len; i+=2) {
					edges.push([points.length - 1, points.length]);
					points.push([b[i]*previewMult, b[i+1]*previewMult]);
					buildingPoints.push([b[i]*previewMult, b[i+1]*previewMult]);
				}
				edges.push([points.length-1, bi]);
			});
		});
		let bpLen = points.length;

		/* // not needed. already done earlier
		let lineSegments = this.citadelWallSegmentsUpper.concat(this.cityWallSegmentsUpper);
		let wallRadius = WALL_RADIUS;
		let cdtObj = this.getCDTObjFromPointsListUnion(lineSegments,
			true, {exterior:false},
			(points, index)=>{
				//points = points.slice(0).reverse();
				points = points.concat().reverse();
				return  index < lineSegments.length ? this.extrudePathOfPoints(points, wallRadius, true, true) : points;
			});

		this.cityWallCDTObj = {
			vertices: cdtObj.vertices,
			edges: cdtObj.edges	
		};
		*/
		
		points = points.concat(this.cityWallCDTObj.vertices);
		let cityWallEdges = this.cityWallCDTObj.edges;
		let cityWallVertices = this.cityWallCDTObj.vertices;
		cityWallEdges.forEach((e, index, array)=> {
			edges.push([e[0]+bpLen, e[1]+bpLen]);
		});
		/*
		cityWallVertices.forEach((v)=> {
			segmentPoints.push(v);
		});
		*/

		/* // Shape library not working
		let buildingsShape = new Shape(pointsList);
		let wallsShape = new Shape(pointsListWall);
		let obstacles = buildingsShape.union(wallsShape);
		*/
	

		let wallRadius = WALL_RADIUS;
		let lineSegments = this.citadelWallSegmentsUpper.concat(this.cityWallSegmentsUpper);
		
		
		let cityWallUnion = this.getPointsListShape(lineSegments,
			(points, index)=>{
				 points = points.slice(0);
				//points = points.slice(0).reverse();
				return this.extrudePathOfPoints(points, wallRadius, true, true);
		});

	
		var buildingsShape = new Shape(pointsList.map((grp)=>{return grp.map(pointToShapePt)})); // CSG.fromPolygons(pointsList);
		var wallsShape = cityWallUnion;
		let obstacles = wallsShape.union(buildingsShape);
	
		//if (inset !== 0) obstacles = obstacles.offset(-inset, {miterLimit:Math.abs(inset)});
		//obstacles = canvasSubject.difference(obstacles);
		// if (inset !== 0) obstacles = obstacles.offset(-inset, {miterLimit:Math.abs(inset)});
		/*
		var svg = $(this.makeSVG("g", {}));
			this.map.append(svg, {});
			svg.append(this.makeSVG("path", {fill:"rgba(0,255,0,0.9)", d: obstacles.paths.map(ptPolySVGString).join(" ") }));

		return;
		*/

		let obstacleVerts = points;
		let obstacleEdges = edges;
		this.collectVerticesEdgesFromShape(obstacleVerts, obstacleEdges, obstacles);
		
		/*
		for (let i=0; i<obstacleEdges.length; i++) {
			obstacleEdges[i][0] += 4;
			obstacleEdges[i][1] += 4;
		}
		*/
		

		//points = obstacleVerts;
		//edges = obstacleEdges;
		
		
		cleanPSLG(points, edges);
		let cdt = cdt2d_1(points, edges, {interior:true, exterior:false});

		let navmesh = new NavMesh();
		navmesh.attemptBuildGraph = false;
		
		navmesh.fromPolygons(cdt.map((tri)=>{return getTriPolygon(points, tri)}));

		if (this._PREVIEW_MODE) {
			var svg = $(this.makeSVG("g", {}));
			this.map.append(svg, {});
			svg.append(this.makeSVG("path", {fill:"rgba(0,255,0,0.9)", stroke:"blue", "stroke-width": 0.15, d: navmesh.regions.map(polygonSVGString).join(" ") }));
			//svg.append(this.makeSVG("path", {stroke:"blue", fill:"none", "stroke-width":0.15, d: navmesh._borderEdges.map(edgeSVGString).join(" ") }));
			//return {vertices:points, edges:edges, cdt:cdt};
		}

		return navmesh;
	}


	getWardBuildingsGeometry(buildingInset=0) {
		let wardCollectors = [];
		this.wardCollectors = wardCollectors;
		let wardRoofCollectors = [];
		this.wardRoofCollectors = wardRoofCollectors;
		let wardCollector;
		let wardRoofCollector;
		const scaleXZ = this.exportScaleXZ;
		let groundLevel;
		let upperLevel;
		console.log(this.wards.length + ": Wards counted");

		this.profileWardBuildings = [];


		const A = new Vector3();
		const B = new Vector3();
		const C = new Vector3();

		const VERTEX_NORMALS = [];
		const EDGE_DIRECTIONS = [];
		const BASE_BUILDING_HEIGHT_RANGE = this.buildingMaxHeight - this.buildingMinHeight;
		const buildingTopIndices = [];

		this.wards.forEach((wardObj)=> {
			wardCollector = getNewGeometryCollector();
			wardCollectors.push(wardCollector);
			wardRoofCollector = getNewGeometryCollector();
			wardRoofCollectors.push(wardRoofCollector);
			let profileBuildings;
			this.profileWardBuildings.push(profileBuildings = []);
			wardObj.neighborhoodPts.forEach((buildingsList)=> {
				buildingsList.forEach((building)=>{
						let buildingProfile;
						profileBuildings.push(buildingProfile = []);
						if (this.rampedBuildings && this.rampedBuildings.has(building)) {
							// 	console.log("Skiping ramped building")
							return;
						}
						if (this.minBuildingEdges >= 4 && building.length < this.minBuildingEdges) {
							return;
						}
						if (this.maxBuildingEdges >= 4 && building.length > this.maxBuildingEdges) {
							return;
						}


						let w0 =  wardCollector.vertices.length;


						const bLen = building.length - 1;

						let vertexNormals = VERTEX_NORMALS;
						let edgeDirs = EDGE_DIRECTIONS;
						let vi = 0;
						let ei = 0;

						building.forEach((pt, i) => {
							let d;
							let prevIndex = i >= 1 ? i - 1 : bLen;
							let prevPt = building[prevIndex];
							let nextIndex = i < bLen ? i + 1 : 0;
							let nextPt = building[nextIndex];
							let dx = pt[0] - prevPt[0];
							let dz = pt[1] - prevPt[1];

							d = Math.sqrt(dx*dx + dz*dz);
							dx /=d;
							dz /=d;
							edgeDirs[ei++] = dx;
							edgeDirs[ei++] = dz;

							let nx = dz;
							let nz = -dx;

							let nx2;
							let nz2;

							dx = nextPt[0] - pt[0];
							dz = nextPt[1] - pt[1];
							d = Math.sqrt(dx*dx + dz*dz);
							dx /=d;
							dz /=d;
							nx2 = dz;
							nz2 = -dx;
							vertexNormals[vi++] = (nx + nx2) * 0.5;
							vertexNormals[vi++] = (nz + nz2) * 0.5;
						});


						let smallestEdgeDist = Infinity;
						let buildingArea = 0;

						for (let i=0; i< building.length; i++) {
							let pt = building[i];
							let prevIndex = i >= 1 ? i - 1 : bLen;
							let prevPt = building[prevIndex];
							let nextIndex = i < bLen ? i + 1 : 0;
							let nextPt = building[nextIndex];

							let ex;
							let ez;

							let dx = (pt[0]*scaleXZ-vertexNormals[i*2]*buildingInset) - (prevPt[0]*scaleXZ-vertexNormals[prevIndex*2]*buildingInset);
							let dz = (pt[1]*scaleXZ-vertexNormals[i*2+1]*buildingInset) - (prevPt[1]*scaleXZ-vertexNormals[prevIndex*2+1]*buildingInset);
							let nx = edgeDirs[i*2];
							let nz = edgeDirs[i*2+1];
							let d = nx * dx + nz * dz;

							if (this.minBuildingEdgeLength > 0 && d < this.minBuildingEdgeLength) {
								return;
							}

							if (d <= 0) {
								// kiv need to collapse edges... for now treat as auto-filtered out
								return;
							}

							if (this.maxBuildingEdgeLength > 0 && d > this.maxBuildingEdgeLength) {
								return;
							}
							if (d < smallestEdgeDist) {
								smallestEdgeDist = d;
							}

							if (i >= 1 && i < bLen) {
								ex = vertexNormals[0]*buildingInset;
								ez = vertexNormals[1]*buildingInset;
								C.x = building[0][0]*scaleXZ - ex;
								C.z =  building[0][1]*scaleXZ - ez;

								ex = vertexNormals[(i*2)]*buildingInset;
								ez = vertexNormals[(i*2)+1]*buildingInset;
								B.x = pt[0]*scaleXZ - ex;
								B.z = pt[1]*scaleXZ-ez;

								ex = vertexNormals[(nextIndex*2)]*buildingInset;
								ez = vertexNormals[(nextIndex*2)+1]*buildingInset;
								A.x = nextPt[0]*scaleXZ - ex;
								A.z = nextPt[1]*scaleXZ - ez;

								buildingArea += MathUtils.area(A, B, C);
							}
						}
						let sampleSmallestEdgeDist = smallestEdgeDist;
						let scaleHeightRange = 1;


						let increase =  BASE_BUILDING_HEIGHT_RANGE * Math.random();

						smallestEdgeDist = this.smallenSqRootAreaTest ? this.smallenSqRootAreaTest < 0 ? Math.min(Math.sqrt(buildingArea), sampleSmallestEdgeDist) : Math.max(Math.sqrt(buildingArea), sampleSmallestEdgeDist) : sampleSmallestEdgeDist;

						if (this.smallenBuildingEdgeLength > 0 && smallestEdgeDist < this.smallenBuildingEdgeLength) {
							scaleHeightRange = (smallestEdgeDist - this.minBuildingEdgeLength) / (this.smallenBuildingEdgeLength - this.minBuildingEdgeLength);
						}

						smallestEdgeDist = this.largenSqRootAreaTest ? this.largenSqRootAreaTest < 0 ? Math.min(Math.sqrt(buildingArea), sampleSmallestEdgeDist) : Math.max(Math.sqrt(buildingArea), sampleSmallestEdgeDist) : sampleSmallestEdgeDist;

						if (this.largenBuildingEdgeLength > 0 &&  smallestEdgeDist > this.smallenBuildingEdgeLength && this.largenBuildingEdgeLength > this.smallenBuildingEdgeLength) {
							scaleHeightRange = 1 + ((smallestEdgeDist - this.smallenBuildingEdgeLength)/(this.largenBuildingEdgeLength-this.smallenBuildingEdgeLength)) * (1 - (increase / BASE_BUILDING_HEIGHT_RANGE));
						}

						increase *= scaleHeightRange;

						groundLevel = this.innerWardAltitude;
						upperLevel = groundLevel + this.buildingMinHeight + increase;



						let bti = 0;


						building.forEach((pt, i) => {
							let prevIndex = i >= 1 ? i - 1 : bLen;
							let prevPt = building[prevIndex];
							let nextIndex = i < bLen ? i + 1 : 0;
							let nextPt = building[nextIndex];
							let dx = pt[0] - prevPt[0];
							let dz = pt[1] - prevPt[1];
							let nx = dz;
							let nz = -dx;
							let ex;
							let ez;
							let d = Math.sqrt(nx*nx + nz*nz);
							nx /=d;
							nz /=d;
							let wv = wardCollector.vertices.length / 3;

							ex = vertexNormals[(i*2)]*buildingInset;
							ez = vertexNormals[(i*2)+1]*buildingInset;
							wardCollector.vertices.push(pt[0]*scaleXZ-ex, upperLevel, pt[1]*scaleXZ-ez);
							wardCollector.normals.push(nx, 0, nz);
							buildingTopIndices[bti++] =wv;

							wardCollector.vertices.push(pt[0]*scaleXZ-ex , groundLevel, pt[1]*scaleXZ-ez);
							buildingProfile.push(pt[0]*scaleXZ-ex,  pt[1]*scaleXZ-ez);
							wardCollector.normals.push(nx, 0, nz);

							ex = vertexNormals[(prevIndex*2)]*buildingInset;
							ez = vertexNormals[(prevIndex*2)+1]*buildingInset;
							wardCollector.vertices.push(prevPt[0]*scaleXZ-ex , groundLevel, prevPt[1]*scaleXZ-ez);
							wardCollector.normals.push(nx, 0, nz);

							wardCollector.vertices.push(prevPt[0]*scaleXZ-ex , upperLevel, prevPt[1]*scaleXZ-ez);
							wardCollector.normals.push(nx, 0, nz);

							wardCollector.indices.push(wv, wv+1, wv+2,   wv, wv+2, wv+3);

							/*  Deprecrated roofing (flat)
							if (i >= 1 && i < bLen) {

								ex = vertexNormals[0]*buildingInset;
								ez = vertexNormals[1]*buildingInset;
								wardCollector.vertices.push(building[0][0]*scaleXZ - ex, upperLevel, building[0][1]*scaleXZ - ez);
								wardCollector.normals.push(0, 1, 0);

								ex = vertexNormals[(i*2)]*buildingInset;
								ez = vertexNormals[(i*2)+1]*buildingInset;
								wardCollector.vertices.push(pt[0]*scaleXZ - ex, upperLevel, pt[1]*scaleXZ-ez);
								wardCollector.normals.push(0, 1, 0);

								ex = vertexNormals[(nextIndex*2)]*buildingInset;
								ez = vertexNormals[(nextIndex*2)+1]*buildingInset;
								wardCollector.vertices.push(nextPt[0]*scaleXZ - ex, upperLevel, nextPt[1]*scaleXZ - ez);
								wardCollector.normals.push(0, 1, 0);

								wardCollector.indices.push(wv+6, wv+5, wv+4);

								//==wardCollector.indices.push(w0, wv, )
								//[ii++] = faceIndices[0];
								//indices[ii++] = faceIndices[f];
								//indices[ii++] = faceIndices[f+1]
							}
							*/


						});

						buildingTopIndices.length = bti;
						buildingTopIndices.reverse();
						this.roofMethod(wardCollector, wardRoofCollector, buildingTopIndices, vertexNormals, buildingInset );

					});
				});

				//profileBuildings.reverse();
			});

		// later, consider varying base heights at different wards even from outside city wall, at number 2 districts from city wall should be lower altitude
		//  depending on distance to city wall, let highways still extend outside city wall after ramp down

		return wardCollectors;
	}

	static buildFlatRoofs(wardCollector, wardRoofCollector, buildingTopIndices, vertexNormals, buildingInset) {
		let len = buildingTopIndices.length;
		let wv = wardRoofCollector.vertices.length / 3;
		let i;
		for (i=0; i< len; i++) {
			let vi = buildingTopIndices[i] * 3;
			wardRoofCollector.vertices.push(wardCollector.vertices[vi], wardCollector.vertices[vi+1], wardCollector.vertices[vi+2]);
			wardRoofCollector.normals.push(0, 1, 0);
		}
		len--;
		for (i=1; i<len ; i++) {
			wardRoofCollector.indices.push(wv+i+1, wv+i, wv);
		}
		return null;
	}

	static buildBasicQuadRoofs(wardCollector, wardRoofCollector, buildingTopIndices, vertexNormals, buildingInset) {
		if (buildingTopIndices.length !== 4 || Math.random() > this.quadRoofChance) {
			SVGCityReader.buildFlatRoofs(wardCollector, wardRoofCollector, buildingTopIndices, vertexNormals, buildingInset);
			return;
		}
		// todo: consider square-cross roofing variation

		// identify long side
		let len = buildingTopIndices.length;
		let wv = wardCollector.vertices.length / 3;
		let wvr = wardRoofCollector.vertices.length / 3;
		let i;
		let i2;
		let D;
		let D2;
		let vi = buildingTopIndices[3] * 3;
		let vi2 = buildingTopIndices[0] * 3;
		let dx = wardCollector.vertices[vi] - wardCollector.vertices[vi2];
		let dz = wardCollector.vertices[vi+2] - wardCollector.vertices[vi2+2];
		D = dx*dx + dz * dz;
		vi = buildingTopIndices[0] * 3;
		vi2 = buildingTopIndices[1] * 3;
		dx =  wardCollector.vertices[vi] - wardCollector.vertices[vi2];
		dz = wardCollector.vertices[vi+2] - wardCollector.vertices[vi2+2];
		D2 = dx*dx + dz*dz;
		let dIndex1;
		let dIndex3;
		// add
		if (D < D2) {
			dIndex1 = 0;
			dIndex3 = 2;

		} else {  //
			dIndex1 = 1;
			dIndex3 = 3;

		}
		i = buildingTopIndices[dIndex1];
		i2 = i + 3;
		vi = i * 3;
		vi2 = i2 * 3;
		wardCollector.vertices.push((wardCollector.vertices[vi] + wardCollector.vertices[vi2]) * 0.5,
			wardCollector.vertices[vi+1] + this.roofApexHeight,
			(wardCollector.vertices[vi+2] + wardCollector.vertices[vi2+2]) * 0.5);
		wardCollector.normals.push(wardCollector.normals[i*3], wardCollector.normals[i2*3+1], wardCollector.normals[i*3+2]);
		wardCollector.indices.push(i, i2, wv++);

		i = buildingTopIndices[dIndex3];
		i2 = i + 3;
		vi = i * 3;
		vi2 = i2 * 3;
		wardCollector.vertices.push((wardCollector.vertices[vi] + wardCollector.vertices[vi2]) * 0.5,
			wardCollector.vertices[vi+1] + this.roofApexHeight,
			(wardCollector.vertices[vi+2] + wardCollector.vertices[vi2+2]) * 0.5);
		wardCollector.normals.push(wardCollector.normals[i*3], wardCollector.normals[i*3+1], wardCollector.normals[i*3+2]);
		wardCollector.indices.push(i , i2, wv++);

		let ap = (wv - 2) * 3;
		let ap2 = (wv - 1) * 3;


		// Roof tops
		if (D < D2) {
			dIndex1 = 1;
			dIndex3 = 3;

		} else {  //
			dIndex1 = 2;
			dIndex3 = 0;
		}


		i = buildingTopIndices[dIndex1];
		i2 = i + 3;
		vi = i * 3;
		vi2 = i2 * 3;
		let plane;
		wardRoofCollector.vertices.push(wardCollector.vertices[vi], wardCollector.vertices[vi+1], wardCollector.vertices[vi+2]);
		wardRoofCollector.vertices.push(wardCollector.vertices[ap2], wardCollector.vertices[ap2+1], wardCollector.vertices[ap2+2]);
		wardRoofCollector.vertices.push(wardCollector.vertices[vi2], wardCollector.vertices[vi2+1], wardCollector.vertices[vi2+2]);
		wardRoofCollector.vertices.push(wardCollector.vertices[ap], wardCollector.vertices[ap+1], wardCollector.vertices[ap+2]);

		plane = NavMeshUtils.planeFromCoplarVertexIndices(wardRoofCollector.vertices, wvr+2, wvr+1, wvr);

		wardRoofCollector.normals.push(plane.normal.x, plane.normal.y, plane.normal.z);
		wardRoofCollector.normals.push(plane.normal.x, plane.normal.y, plane.normal.z);
		wardRoofCollector.normals.push(plane.normal.x, plane.normal.y, plane.normal.z);
		wardRoofCollector.normals.push(plane.normal.x, plane.normal.y, plane.normal.z);

		wardRoofCollector.indices.push(wvr+2, wvr+3, wvr+1);
		wardRoofCollector.indices.push(wvr+2, wvr+1, wvr);
		wvr += 4;

		i = buildingTopIndices[dIndex3];
		i2 = i + 3;
		vi = i * 3;
		vi2 = i2 * 3;
		wardRoofCollector.vertices.push(wardCollector.vertices[vi], wardCollector.vertices[vi+1], wardCollector.vertices[vi+2]);
		wardRoofCollector.vertices.push(wardCollector.vertices[ap], wardCollector.vertices[ap+1], wardCollector.vertices[ap+2]);
		wardRoofCollector.vertices.push(wardCollector.vertices[vi2], wardCollector.vertices[vi2+1], wardCollector.vertices[vi2+2]);
		wardRoofCollector.vertices.push(wardCollector.vertices[ap2], wardCollector.vertices[ap2+1], wardCollector.vertices[ap2+2]);

		plane = NavMeshUtils.planeFromCoplarVertexIndices(wardRoofCollector.vertices, wvr+2, wvr+1, wvr);

		wardRoofCollector.normals.push(plane.normal.x, plane.normal.y, plane.normal.z);
		wardRoofCollector.normals.push(plane.normal.x, plane.normal.y, plane.normal.z);
		wardRoofCollector.normals.push(plane.normal.x, plane.normal.y, plane.normal.z);
		wardRoofCollector.normals.push(plane.normal.x, plane.normal.y, plane.normal.z);

		wardRoofCollector.indices.push(wvr+2, wvr+3, wvr+1);
		wardRoofCollector.indices.push(wvr+2, wvr+1, wvr);
		wvr += 4;
	}



	// -----

	testSubdivideBuilding(building) {
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


		let result = this.carveRamps(edges[2], true, 12, Infinity);
		return this.buildRamps(result, this.highwayAltitude, this.innerWardAltitude);
	}

	slopeDownRamp(geom, accumSlopeY, slopeYDist, toTailSide) {
		let ramp = geom.ramp;
		let len = ramp.length;

		// first landing from above
		let landing = toTailSide ? geom.head : geom.tail;
		NavMeshUtils.adjustAltitudeOfPolygon(landing, -accumSlopeY);
		landing.sep = true;

		// in-between ramp downs + landings if any
		for (let i =1; i<len; i+=2) {
			NavMeshUtils.adjustAltitudeOfPolygon(ramp[i], -slopeYDist - accumSlopeY);
			ramp[i].sep = true;
			accumSlopeY += slopeYDist;
		}

		// last landing from below
		landing = toTailSide ? geom.tail : geom.head;
		NavMeshUtils.adjustAltitudeOfPolygon(landing, -slopeYDist - accumSlopeY);
		accumSlopeY += slopeYDist;
		landing.sep = true;
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
		//svg.append(this.makeSVG("path", {stroke:"red", fill:"none", "stroke-width":0.15, d: navmesh.regions.map(polygonSVGString).join(" ") }));
		//svg.append(this.makeSVG("path", {stroke:"blue", fill:"none", "stroke-width":0.15, d: navmesh._borderEdges.map(edgeSVGString).join(" ") }));

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
	
	collectVerticesEdgesFromShape(vertices, edges, shape) {
		let paths = shape.paths;
		// let mapVerts = new Map();
		paths.forEach((points)=>{
			let baseCount = vertices.length;

			let count = baseCount;
			points.forEach((p, index)=> {
				
				if (index >= 1) edges.push([count-1, count]);
				if (index === points.length - 1) edges.push([count, baseCount]);
				count++;
				vertices.push([p.X, p.Y]);

				// note caveat: non welded
				/*
				let key = p.X + "," + p[0].Y;
				let key2 =  p[1].X + "," + p[1].Y;
				if (!mapVerts.has(key)) {
					vertices.push([seg[0].X, seg[0].Y]);
					mapVerts.set(key, vi++);
				}
				if (!mapVerts.has(key2)) {
					vertices.push(([seg[1].X, seg[1].Y]));
					mapVerts.set(key2, vi++);
				}
				edges[ei++] = [mapVerts.get(key), mapVerts.get(key2)];
				*/
			});
		});
	}

	collectVerticesEdgesFromCSG(vertices, edges, csg) {
		let segments = csg.segments;
		let mapVerts = new Map();
		let vi = vertices.length;
		let ei = edges.length;
		segments.forEach((seg)=>{
			let key = seg.vertices[0].x + "," + seg.vertices[0].y;
			let key2 =  seg.vertices[1].x + "," + seg.vertices[1].y;
			if (!mapVerts.has(key)) {
				vertices.push([seg.vertices[0].x, seg.vertices[0].y]);
				mapVerts.set(key, vi++);
			}
			if (!mapVerts.has(key2)) {
				vertices.push(([seg.vertices[1].x, seg.vertices[1].y]));
				mapVerts.set(key2, vi++);
			}
			edges[ei++] = [mapVerts.get(key), mapVerts.get(key2)];
		});
	}

	getPointsListUnion(pointsList, processPointsMethod) {
		let polygonsListCSG = [];
		pointsList.forEach((points, index)=> {
			if (processPointsMethod) points = processPointsMethod(points, index);
			polygonsListCSG.push(csg2d.fromPolygons([points]));
		});

		let csg = polygonsListCSG[0];
		for (let i=1; i<polygonsListCSG.length; i++) {
			csg = csg.union(polygonsListCSG[i]);
		}

		return csg;
	}

	getPointsListShape(pointsList, processPointsMethod) {
		let polygonsListCSG = [];
		pointsList.forEach((points, index)=> {
			if (processPointsMethod) points = processPointsMethod(points, index);
			polygonsListCSG.push(points.map(pointToShapePt));
		});
		let csg = new Shape(polygonsListCSG);
		return csg;
	}

	getCDTObjFromPointsListUnion(pointsList, cleanup, params, processPointsMethod) {
		let polygonsListCSG = [];
		pointsList.forEach((points, index)=> {
			if (processPointsMethod) points = processPointsMethod(points, index);
			polygonsListCSG.push(csg2d.fromPolygons([points]));
		});

		let csg = polygonsListCSG[0];
		for (let i=1; i<polygonsListCSG.length; i++) {
			csg = csg.union(polygonsListCSG[i]);
		}

		let vertices = params.vertices ? params.vertices.slice(0) : [];
		let edges = params.edges ? params.edges.slice(0) : [];
		this.collectVerticesEdgesFromCSG(vertices, edges, csg);

		if (cleanup) {
			cleanPSLG(vertices, edges);
		}

		let cdt = cdt2d_1(vertices, edges, (params ? params : {exterior:true}));
		return {vertices:vertices, edges:edges, cdt:cdt};
	}

	//convertCSGPolygonsTo

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
			cleanPSLG(vertices, edges);
		}

		let cdt = cdt2d_1(vertices, edges, (params ? params : {exterior:true}));

		return {vertices:vertices, edges:edges, cdt:cdt};
	}

	parseCitadel(jSel) {

	}

	parseLandmark(jSel) {

	}

	parsePlaza(jSel) {

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
			this.aabb2d.expand(pt);
		});

		jEntrances.each((index, item)=>{
			let pt = getBBoxCenter($(item).children()[0].getBBox());
			this.cityWallEntrancePoints.push(pt);
			this.aabb2d.expand(pt);
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
				this.aabb2d.expand(this.citadelWallEntrancePoint);
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
	
			/*
			g.append(
					this.makeSVG("path", {"fill":"none", "stroke-width":0.5, "stroke":"orange",
						d: this.citadelWallSegments.map((pts)=>{
							return this.extrudePathOfPoints(pts, pathRadius, true, true).map((p, index)=>{
								return (index >= 1 ? `L ${p[0]},${p[1]}` : `M ${p[0]},${p[1]}`)
							}).join("");
						}).join(" Z ") + " Z" }
				));
			*/
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
		cleanPSLG(edgeVertices, edgesBoundary);

		let cdt = cdt2d_1(edgeVertices, edgesBoundary, {exterior:false});
		this.cityWallCDTBoundary = {cdt:cdt, vertices:edgeVertices};
		/*
		g.append(
			this.makeSVG("path", {"fill":"rgba(155,255,122,0.3)", "stroke-width":0.1, "stroke":"red",
				d: cdt.map((tri)=>{return triSVGString(this.cityWallCDTBoundary.vertices, tri)}).join(" ")})
		);
		*/
	
		this.citadelWallCDTBoundary = this.getCDTObjFromPointsListUnion(this.citadelWallSegments, true, {exterior:false});
		/*
		g.append(
			this.makeSVG("path", {"fill":"rgba(155,111,122,0.7)", "stroke-width":0.1, "stroke":"red",
				d: this.citadelWallCDTBoundary.cdt.map((tri)=>{return triSVGString(this.citadelWallCDTBoundary.vertices, tri)}).join(" ")})
		);
		*/

		let wallRadius = WALL_RADIUS;
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
		
		let cdtObj = this.getCDTObjFromPointsListUnion(lineSegments,
			true, {exterior:false},
			(points, index)=>{
				//points = points.slice(0).reverse();
				return  index < lineSegments.length ? this.extrudePathOfPoints(points, wallRadius, true, true) : points;
			});

		cdt = cdtObj.cdt;

		this.cityWallCDTObj = {
			vertices: cdtObj.vertices,
			edges: cdtObj.edges	
		};
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

		/*  // only needed if using non union option cdt
		let holesArr = NavMeshUtils.patchHoles(navmesh.regions);
		let combinedRegions = navmesh.regions.concat(holesArr); //NavMeshUtils.unlinkPolygons();
		navmesh.regions = combinedRegions;
		//*/

		//navmesh = new NavMesh();
		//navmesh.attemptBuildGraph = false;
		//navmesh.fromPolygons(combinedRegions);

		// comm awa
		//g.append(this.makeSVG("path", {stroke:"blue", fill:"rgba(255,255,0,0.4)", "stroke-width":0.15, d: navmesh.regions.map(polygonSVGString).join(" ") }));
		
		
		//g.append(this.makeSVG("path", {stroke:"red", fill:"none", "stroke-width":0.15, d: navmesh._borderEdges.map(edgeSVGString).join(" ") }));
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

		this.cityWallEntrancePillarPoints = []; // TODO: need to find a way to detect this
		edgeVertices.forEach((p)=>{
			let pt = segPointToVector3(p);
			if (!withinVincityOfPointSet(pt, this.cityWallEntrancePoints, this.detectCityWallEntranceTowersDist)) {
				return;
			}
			navmeshTagRegionByPt(navmesh, pt, null, errors);

			if (pt.region && !pt.region.mask) {
				// Check if point is closest enough to entrance
				//if (pt.squaredDistanceTo())
				pt.region.mask = BIT_CITADEL_TOWER;
				this.cityWallEntrancePillarPoints.push(pt);
			}
		});

		if (this.citadelWallEntrancePoint) navmeshTagRegionByPt(navmesh, this.citadelWallEntrancePoint, BIT_CITADEL_ENTRANCE, errors);

		errors.forEach((e)=>{
			console.warn("city wall point region find error founds");
			g.append(this.makeSVG("circle", {r:0.5, "stroke":"red", fill:"white", cx:e.x, cy:e.z}));
		});

		NavMeshUtils.setAbsAltitudeOfAllPolygons(navmesh.regions, this.cityWallAltitude);

		return navmesh;
	}

	prepareCityWallExtraPolygons() {

		var g = $(this.makeSVG("g", {}));
		this.map.append(g, {});

		// this.navmeshCityWall

		let refPts = this.cityWallPillarPoints.concat(this.cityWallEntrancePillarPoints).concat(this.citadelWallPillarPoints).concat(this.citadelWallEntrancePillarPoints);

		// TOWER PILLAR WALLING (at both enrances and on both citadel and cit wall)
		this.cityWallTowerWallPolies = [];
		refPts.forEach((pt)=>{
			if (!pt.region) return;
			g.append(this.makeSVG("path", {stroke:"purple", "stroke-width":0.5, d: polygonSVGString(pt.region)  }));

			//console.log("Walling:"+NavMeshUtils.countBorderEdges(pt.region));

			NavMeshUtils.getBorderEdges(pt.region).forEach((e)=>{
				let poly = NavMeshUtils.getNewExtrudeEdgePolygon(e, this.extrudeCityWallTowerWall);
				this.cityWallTowerWallPolies.push(poly);
				g.append(this.makeSVG("path", {stroke:"purple", "stroke-width":0.2, d: polygonSVGString(poly)  }));
			});
		});

		// tower ceilings & roofings(kiv) (citadel/city wall corners and entrances)
		this.cityWallTowerCeilingPolies = [];
		refPts.forEach((pt)=>{
			if (!pt.region) return;
			//this.cityWallTOwer
			this.cityWallTowerCeilingPolies.push(NavMeshUtils.clonePolygon(pt.region));
		});

		NavMeshUtils.setAbsAltitudeOfAllPolygons(this.cityWallTowerWallPolies, this.cityWallTowerTopAltitude);
		NavMeshUtils.setAbsAltitudeOfAllPolygons(this.cityWallTowerCeilingPolies, this.cityWallTowerTopAltitude);
		// kiv extra possible Ceilubgs.ROOFINGS
		// KIV entrance roofing? (city wall), above city wall level
		// KIV entrance roofing (citaldel) ? above highway level
		// KIV entrance roofing (city wall) (above highway level)
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
				this.aabb2d.expand(hullPoints[i]);
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


		let rampDowns = [];
		const rampDownLevel = this.onlyElevateRoadsWithinWalls ? this.innerWardAltitude : this.outerRoadAltitude;
		let highways = [];
		let roadsInner = [];
		let roadsOuter = [];
		const potentialHighwayRoadCrossroads = [];

		const rampDownParams = {yVal:this.highwayExtrudeThickness, yBottom:false, yBottomMin:this.innerWardAltitude };

		for (let i=0; i<len; i++) {
			r = regions[i];
			edge = r.edge;

			let numOfLongEdges = 0;
			let numOfLongEdgesAbs = 0;
			let numOfShortEdges = 0;
			let totalEdgesAllTypes = 0;
			let numOfEdgesWithinCityWalls = 0;
			let numOfEdgesJustOutsideCityWalls = 0;

			let streetwards = new Set();

			do {
				totalEdgesAllTypes++;

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


					lineSegment$2.set(oppEdge.prev.vertex, oppEdge.vertex);
					let t = lineSegment$2.closestPointToPointParameter(edge.vertex, false);
					lineSegment$2.at( t, pointOnLineSegment$2 );

					//g.append(this.makeSVG("line", {stroke:"rgb(255,255,255)", "stroke-width":0.25, x1:lineSegment.from.x, y1:lineSegment.from.z, x2:lineSegment.to.x, y2:lineSegment.to.z}));

					numOfEdgesWithinCityWalls += this.wards[edge.prev.vertex.id].withinCityWall && this.wards[edge.vertex.id].withinCityWall ? 1 : 0;

					numOfEdgesJustOutsideCityWalls += this.wards[edge.prev.vertex.id].distanceOutsideToWalls===1 && this.wards[edge.vertex.id].distanceOutsideToWalls === 1 ? 1 : 0;

					let dist =  pointOnLineSegment$2.squaredDistanceTo( edge.vertex );



					if (dist <= highwayMaxWidthSq) {

						if (edge.prev.vertex.squaredDistanceTo(edge.vertex) >= highwayMinWidthSq) {
							numOfLongEdgesAbs++;
						}

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
				if ( numOfLongEdges !== 0 || (totalEdgesAllTypes ===3 && numOfLongEdgesAbs >=2) ) {
					if ( (numOfEdgesWithinCityWalls >=2 || numOfEdgesJustOutsideCityWalls >= 2)  ) {
						let isRampDown = numOfEdgesWithinCityWalls < 2;
						r.mask = isRampDown ? (BIT_HIGHWAY_RAMP|BIT_HIGHWAY) : BIT_HIGHWAY;
						if (isRampDown) {
							r.yExtrudeParams = rampDownParams;
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
							r.mask = numOfEdgesWithinCityWalls>=2 ? BIT_WARD_ROAD : BIT_WARD_ROAD_OUTER; // could be thick also
							(numOfEdgesWithinCityWalls>=2  ? roadsInner : roadsOuter).push(r);
							g.append(this.makeSVG("path", {stroke:"blue", fill:"rgba(44,0,44,0.5)", "stroke-width":0.015, d: polygonSVGString(r) }));
						}
					}
				}
				else {
					if (!this.onlyElevateRoadsWithinWalls || (numOfEdgesWithinCityWalls >= 2)) {
						r.mask = numOfEdgesWithinCityWalls>=2 ? BIT_WARD_ROAD : BIT_WARD_ROAD_OUTER; // always thin
						(numOfEdgesWithinCityWalls>=2  ? roadsInner : roadsOuter).push(r);
						g.append(this.makeSVG("path", {stroke:"blue", fill:"rgba(255,0,255,0.5)", "stroke-width":0.015, d: polygonSVGString(r) }));
					}
				}
			}
		}

		potentialHighwayRoadCrossroads.forEach((r)=> {
			if (this.validateShortRoadEdges(2, r)) {
				r = NavMeshUtils.clonePolygon(r);
				r.mask = BIT_WARD_ROAD;
				roadsInner.push(r);
				g.append(this.makeSVG("path", {stroke:"blue", fill:"none", "stroke-width":0.1, d: polygonSVGString(r) }));
			}
		});

		// kiv todo: Citadel wall region identify and filter out in order to further extrude down to ward road level,
		// kiv todo: Plaza region identify and filter out, extrude down to ward Road level, extrude down to ground level as additional layer or other methods
		// kiv above: maybe have some custom mound terrain below those regions to support highway platform, or mounted terrrain with elevated wards near citadel

		// fow now, citadel wall exttudes down to rampDown level, until ground portio polygons below ctiy wall can be easily isolated

		highways = NavMeshUtils.filterOutPolygonsByMask(highways, -1, true);
		NavMeshUtils.setAbsAltitudeOfAllPolygons(highways, this.highwayAltitude);

		roadsInner = NavMeshUtils.filterOutPolygonsByMask(roadsInner, -1, true);
		//roadsOuter = NavMeshUtils.filterOutPolygonsByMask(roadsOuter, -1, true);

		NavMeshUtils.setAbsAltitudeOfAllPolygons(roadsInner, this.wardRoadAltitude);
		NavMeshUtils.setAbsAltitudeOfAllPolygons(roadsOuter, this.outerRoadAltitude);


		rampDowns = NavMeshUtils.filterOutPolygonsByMask(rampDowns, -1, true);
		NavMeshUtils.setAbsAltitudeOfAllPolygons(rampDowns, rampDownLevel);

		let resetupRamps = new NavMesh();
		resetupRamps.attemptBuildGraph = false;
		resetupRamps.attemptMergePolies = false;
		resetupRamps.fromPolygons(rampDowns);

		const cityWallEntranceExtrudeParams = {
			yVal: this.cityWallEntranceExtrudeThickness,
			yBottom: false
		};

		const cityWallEntranceWallParams = {
			yVal: rampDownLevel,
			bordersOnly: true,
			yBottom: true
		};

		navmesh.regions = highways.concat(roadsOuter).concat(roadsInner);

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

				p.region.yExtrudeParams = cityWallEntranceExtrudeParams;

				let edge = p.region.edge;
				let bi = NavMeshUtils.countBorderEdges(p.region, true);
				let biMask = 0;
				do {
					bi--;
					biMask |= edge.twin ? (1 << bi) : 0;
					edge = edge.next;
				} while (edge !== p.region.edge);
				let entryWayWallsBelow = NavMeshUtils.clonePolygon(p.region, true);
				entryWayWallsBelow.yExtrudeParams = cityWallEntranceWallParams;
				entryWayWallsBelow.mask = BIT_WARD_ROAD;
				entryWayWallsBelow.edgeMask = ~biMask; // not sure why need to flip
				NavMeshUtils.setAbsAltitudeOfPolygon(entryWayWallsBelow, this.cityWallAltitude);

				let entryWay = NavMeshUtils.clonePolygon(p.region);
				NavMeshUtils.setAbsAltitudeOfPolygon(entryWay, this.highwayAltitude);
				entryWay.mask = BIT_HIGHWAY;
				navmesh.regions.push(entryWay);
				navmesh.regions.push(entryWayWallsBelow);

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
					r.mask = BIT_HIGHWAY;
					g.append(this.makeSVG("path", {stroke:"blue", fill:("rgba(255,0,0,0.5)"), "stroke-width":0.4, d: polygonSVGString(r) }));
					navmesh.regions.push(r);
					//console.log("COnnected poly:"+r.convex(true));
				});

				/*
				edge = entryWay.edge;
				do {

					if (edge.twin ) {
						g.append(this.makeSVG("path", {stroke:"green", fill:("rgba(255,0,0,0.5)"), "stroke-width":0.4, d: edgeSVGString(edge) }));
					}
					edge = edge.next;
				} while (edge !== entryWay.edge);
				*/

				if (!e2) { // add a highway perch leading out from entryway polygon
					edge = p.region.edge;
					let edgeEntryway = entryWay.edge;
					console.log("Consider perch..");
					do {

						if (!edge.twin && !edgeEntryway.twin) {
							console.log("DEtected 1 perch:");

							let perch = NavMeshUtils.getNewExtrudeEdgePolygon(edgeEntryway, this.highwayPerchNoRampLength, true);
							g.append(this.makeSVG("path", {stroke:"red", fill:("rgba(255,0,0,0.5)"), "stroke-width":0.4, d: polygonSVGString(perch) }));
							perch.mask = BIT_HIGHWAY;

							NavMeshUtils.setAbsAltitudeOfPolygon(perch, this.highwayAltitude);
							navmesh.regions.push(perch);
						}
						edgeEntryway = edgeEntryway.next;
						edge = edge.next;
					} while (edge !== p.region.edge);
				}
			} else {
				console.warn("Missed Entrance connect highway entirely!");
			}
		});

		let rampDownsSet = new Set();
		let considerAdditionalRamps = [];
		const rampLengthSquaredReq = this.highwayMinRampBorderLength * this.highwayMinRampBorderLength;
		rampDowns.forEach((r)=>{
			let edge = r.edge;
			//r.sep = true;
			let longestBorderLength = 0;
			let hasNeighborRampPolygon = false;
			do {
				if (edge.twin) {

					if (edge.twin.polygon.connectRamp) {
						console.log("detected rampdown edge");
						edge.prev.vertex.y = this.highwayAltitude;
						edge.vertex.y = this.highwayAltitude;
						rampDownsSet.add(edge.polygon);
					}
					else if ((edge.twin.polygon.mask & BIT_HIGHWAY_RAMP)) {
						hasNeighborRampPolygon = true;
						// weld on the fly
						edge.twin.vertex = edge.prev.vertex;
						edge.twin.prev.vertex = edge.vertex;
					}
					//g.append(this.makeSVG("path", {stroke:"green", fill:("rgba(255,0,0,0.5)"), "stroke-width":0.4, d: edgeSVGString(edge) }));
				} else {
					let dx = edge.vertex.x - edge.prev.vertex.x;
					let dz = edge.vertex.z - edge.prev.vertex.z;

					let testLength = dx*dx + dz*dz;
					if (testLength > longestBorderLength) {
						longestBorderLength = testLength;
					}
				}
				edge = edge.next;
			} while(edge !== r.edge);
			//console.log(longestBorderLength + ", "+rampLengthSquaredReq);
			if (rampDownsSet.has(r) && longestBorderLength < rampLengthSquaredReq && hasNeighborRampPolygon) {
				considerAdditionalRamps.push(r);
				r.longestBorderLength = Math.sqrt(longestBorderLength);
				edge = r.edge;
				do {
					edge.vertex.y = this.highwayAltitude;
					edge = edge.next;
				} while(edge !== r.edge);
			}
		});

		while (considerAdditionalRamps.length > 0) {
			let r = considerAdditionalRamps.pop();
			let edge = r.edge;
			let longestBorderLength = 0;
			let hasNeighborRampPolygon = false;
			let addedNeighbor;

			do {
				if (edge.twin) {
					if ((edge.twin.polygon.mask & BIT_HIGHWAY_RAMP)) {
						if ( !rampDownsSet.has(edge.twin.polygon)) {
							if (!hasNeighborRampPolygon) {
								hasNeighborRampPolygon = true;
								addedNeighbor = edge.twin.polygon;
								edge.twin.vertex = edge.prev.vertex;
								edge.twin.prev.vertex = edge.vertex;
								rampDownsSet.add(edge.twin.polygon);
							}
						}
						//console.log("ADDED ADDITIONAL)");
					}
					//g.append(this.makeSVG("path", {stroke:"green", fill:("rgba(255,0,0,0.5)"), "stroke-width":0.4, d: edgeSVGString(edge) }));
				} else {
					let dx = edge.vertex.x - edge.prev.vertex.x;
					let dz = edge.vertex.z - edge.prev.vertex.z;
					let testLength = dx*dx + dz*dz;
					if (testLength > longestBorderLength) {
						longestBorderLength = testLength;
					}
				}
				edge = edge.next;
			} while (edge !== r.edge);


			longestBorderLength = Math.sqrt(longestBorderLength);
			//console.log("RUnning comparisons:"+hasNeighborRampPolygon + ", "+r.longestBorderLength + ", "+longestBorderLength);
			if (hasNeighborRampPolygon && r.longestBorderLength + longestBorderLength  < this.highwayMinRampBorderLength) {
				considerAdditionalRamps.push(addedNeighbor);
				addedNeighbor.longestBorderLength = r.longestBorderLength + longestBorderLength;
				edge = r.edge;
				do {
					edge.vertex.y = this.highwayAltitude;
					edge = edge.next;
				} while(edge !== r.edge);
			}
		}

		rampDowns = rampDowns.filter((r)=> {return rampDownsSet.has(r)});
		NavMeshUtils.unlinkPolygons(rampDowns);
		navmesh.regions = navmesh.regions.concat(rampDowns);

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
		return this.checkWithinCDTBoundary(this.cityWallCDTBoundary, x,y);
	}

	checkWithinCDTBoundary(cdtBoundary, x, y) {
		let tris = cdtBoundary.cdt;
		let vertices = cdtBoundary.vertices;
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
				lineSegment$2.set( edge.prev.vertex, edge.vertex );
				let t = lineSegment$2.closestPointToPointParameter(region.s.region.centroid, false);
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
			lineSegment$2.set( prev, cur );

			let t = lineSegment$2.closestPointToPointParameter( centroid, false);
			lineSegment$2.at( t, pointOnLineSegment$2 );
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
				lineSegment$2.set( edge.prev.vertex, edge.vertex );

				let t = lineSegment$2.closestPointToPointParameter( r.centroid, false);
				lineSegment$2.at( t, pointOnLineSegment$2 );
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

				for (v=vLen-1; v>=0; v--) {
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

export { AABB, AStar, AlignmentBehavior, ArriveBehavior, BFS, Cell, CellSpacePartitioning, CohesionBehavior, DFS, Dijkstra, Edge, EntityManager, EventDispatcher, FlowAgent, FlowTriangulate, FlowVertex, GameEntity, Graph, HalfEdge, LineSegment, MovingEntity, NavEdge, NavMesh, NavMeshFlowField, NavMeshFlowFieldBehavior, NavNode, Node, OBB, Plane, Polygon, PriorityQueue, SVGCityReader, SeparationBehavior, SteeringBehavior, SteeringManager, Vector3, Vehicle, WorldUp };
