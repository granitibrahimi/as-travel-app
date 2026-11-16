import { h } from 'vue';
import { icons } from '../lib/icons';

/** An icon as a real <svg> (CSS like `.road-status > svg` targets it directly). */
export default function Icon(props) {
    const match = /^<svg([^>]*)>([\s\S]*)<\/svg>$/.exec(icons[props.name] ?? '');
    if (!match) return null;
    const attrs = {};
    for (const [, key, value] of match[1].matchAll(/([\w-]+)="([^"]*)"/g)) attrs[key] = value;
    if (props.class) attrs.class = props.class;
    return h('svg', { ...attrs, innerHTML: match[2] });
}
Icon.props = ['name', 'class'];
