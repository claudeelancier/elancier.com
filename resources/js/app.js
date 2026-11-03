import './bootstrap';

import Alpine from 'alpinejs';
import { marked } from 'marked';
import DOMPurify from 'dompurify';
import hljs from 'highlight.js';
import 'highlight.js/styles/github-dark.min.css';

window.Alpine = Alpine;
window.marked = marked;
window.DOMPurify = DOMPurify;
window.hljs = hljs;

Alpine.start();
