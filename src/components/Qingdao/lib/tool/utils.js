import { CSS2DObject, CSS2DRenderer } from "three/examples/jsm/renderers/CSS2DRenderer";

export function addCSS2Object (mesh, text, translate, customStyle) {
    if (mesh) {
        const styles = customStyle || {
            background: 'var(--theme-bg)',
            color: 'var(--text-color)',
            borderRadius: '2px',
            padding: '5px 10px',
            width: 'content-max',
            fontSize: '12px'
        };

        const element = document.createElement('div');
        element.className = 'name';

        for(let key in styles) {
            element.style[key] = styles[key];
        }

        element.innerHTML = text;
        const container = document.createElement('div');

        container.append(element);

        const objectCSS = new CSS2DObject(container);
        if (Array.isArray(translate)) {
            objectCSS.translateX(translate[0] || 0);
            objectCSS.translateY(translate[1] || 0);
            objectCSS.translateZ(translate[2] || 0);
        } else {
            objectCSS.translateZ(translate || 1000);
        }

        mesh.layers.enableAll();
        mesh.add(objectCSS);
        mesh.layers.set(0);
    }
}