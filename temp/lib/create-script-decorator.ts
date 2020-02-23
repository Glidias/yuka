/**
 * Class decorator allowing the use of ES6 classes  
 * to define and create PlayCanvas script types. 
 * @param {pc.Application} [app]
 */
export const createScript = function(app?: pc.Application) {
    return function (obj: any) {
        const instance = new obj();
        const script = pc.createScript(instance.name, app);
        const attributes = [];
    
        // Add public attributes accessible in the editor
        if (instance.attributesData) {
            for (let attr in instance.attributesData) {
                attributes.push(attr)
                script.attributes.add(attr, instance.attributesData[attr])
            }
        }
        // Add intance properties and methods to prototype
        let proto = (script as any).prototype;
        for (let prop in instance) {
            if (prop === 'attributes' || prop === 'name' || attributes.includes(prop)) {
                // do nothing
            } else {
                proto[prop] = instance[prop];
            }
        }
    
        // Add static properties
        for (let prop in obj) {
            (script as any)[prop] = obj[prop];
        }
    }
}


/**
 * Base class to be extended when defining  
 * ScriptType classes
 * @export
 * @class ScriptTypeBase
 */
export interface ScriptTypeBase extends Pick<pc.ScriptType, keyof pc.ScriptType> {
    /**
     * The pc.Application that the instance of this type belongs to.
     * @type {pc.Application}
     * @memberof ScriptType
     */
    app: pc.Application;

    /**
     * 	The pc.Entity that the instance of this type belongs to.
     * @type {pc.Entity}
     * @memberof ScriptType
     */
    entity: pc.Entity;

    /**
     * True if the instance of this type is in running state.
     * @type {boolean}
     * @memberof ScriptType
     */
    enabled: boolean;    

    readonly attributes: pc.ScriptAttributes;
}