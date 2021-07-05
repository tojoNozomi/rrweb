import { NodeType, serializedNodeWithId } from 'rrweb-snapshot';
import { parseCSSText, camelize, toCSSText } from './style';

export abstract class RRNode {
  __sn: serializedNodeWithId;
  children: Array<RRNode>;
  parentElement: RRElement | null = null;
  parentNode: RRNode | null = null;
  ELEMENT_NODE = 1;
  TEXT_NODE = 3;

  constructor() {
    this.children = [];
  }

  get firstChild() {
    return this.children[0];
  }

  get nodeType() {
    if (this instanceof RRDocument) return NodeType.Document;
    if (this instanceof RRDocumentType) return NodeType.DocumentType;
    if (this instanceof RRElement) return NodeType.Element;
    if (this instanceof RRText) return NodeType.Text;
    if (this instanceof RRCDATASection) return NodeType.CDATA;
    if (this instanceof RRComment) return NodeType.Comment;
  }

  get childNodes() {
    return this.children;
  }

  appendChild(newChild: RRNode): RRNode {
    throw new Error(
      `RRDomException: Failed to execute 'appendChild' on 'RRNode': This RRNode type does not support this method.`,
    );
  }

  insertBefore(newChild: RRNode, refChild: RRNode | null): RRNode {
    throw new Error(
      `RRDomException: Failed to execute 'insertBefore' on 'RRNode': This RRNode type does not support this method.`,
    );
  }

  contains(node: RRNode) {
    throw new Error('Not implemented yet.');
  }

  removeChild(node: RRNode) {
    const indexOfChild = this.children.indexOf(node);
    if (indexOfChild !== -1) {
      this.children.splice(indexOfChild, 1);
      node.parentElement = null;
      node.parentNode = null;
    }
  }
}

export class RRWindow {
  scrollLeft = 0;
  scrollTop = 0;
  scrollTo(options?: ScrollToOptions) {
    if (!options) return;
    if (typeof options.left === 'number') this.scrollLeft = options.left;
    if (typeof options.top === 'number') this.scrollTop = options.top;
  }
}

export class RRDocument extends RRNode {
  get documentElement() {
    return this.children.filter(
      (node) => node instanceof RRElement && node.tagName === 'html',
    )[0];
  }

  get body() {
    return (
      this.documentElement?.children.filter(
        (node) => node instanceof RRElement && node.tagName === 'body',
      )[0] || null
    );
  }

  get head() {
    return (
      this.documentElement?.children.filter(
        (node) => node instanceof RRElement && node.tagName === 'head',
      )[0] || null
    );
  }

  get implementation() {
    return this;
  }

  appendChild(childNode: RRNode) {
    const nodeType = childNode.nodeType;
    if (nodeType === NodeType.Element || nodeType === NodeType.DocumentType) {
      if (this.children.some((s) => s.nodeType === nodeType)) {
        throw new Error(
          `RRDomException: Failed to execute 'appendChild' on 'RRNode': Only one ${
            nodeType === NodeType.Element ? 'RRElement' : 'RRDoctype'
          } on RRDocument allowed.`,
        );
      }
    }
    childNode.parentElement = null;
    childNode.parentNode = this;
    this.children.push(childNode);
    return childNode;
  }

  insertBefore(newChild: RRNode, refChild: RRNode | null) {
    if (refChild === null) return this.appendChild(newChild);
    const childIndex = this.children.indexOf(refChild);
    if (childIndex == -1)
      throw new Error(
        "Failed to execute 'insertBefore' on 'RRNode': The RRNode before which the new node is to be inserted is not a child of this RRNode.",
      );
    this.children.splice(childIndex, 0, newChild);
    return newChild;
  }

  getElementsByTagName(tagName: string): RRElement[] {
    let elements: RRElement[] = [];
    if (this instanceof RRElement && this.tagName === tagName)
      elements.push(this);
    for (const child of this.children) {
      if (child instanceof RRElement)
        elements = elements.concat(child.getElementsByTagName(tagName));
    }
    return elements;
  }

  createDocument(
    _namespace: string | null,
    _qualifiedName: string | null,
    _doctype?: DocumentType | null,
  ) {
    return new RRDocument();
  }

  createDocumentType(
    qualifiedName: string,
    publicId: string,
    systemId: string,
  ) {
    return new RRDocumentType(qualifiedName, publicId, systemId);
  }

  createElement<K extends keyof HTMLElementTagNameMap>(
    tagName: K,
  ): RRElementType<K>;
  createElement(tagName: string): RRElement;
  createElement(tagName: string) {
    const lowerTagName = tagName.toLowerCase();
    switch (lowerTagName) {
      case 'audio':
      case 'video':
        return new RRMediaElement(lowerTagName);
      case 'iframe':
        return new RRIframeElement(lowerTagName);
      case 'img':
        return new RRImageElement('img');
      default:
        return new RRElement(lowerTagName);
    }
  }

  createElementNS(
    _namespaceURI: 'http://www.w3.org/2000/svg',
    qualifiedName: string,
  ) {
    return this.createElement(qualifiedName as keyof HTMLElementTagNameMap);
  }

  createComment(data: string) {
    return new RRComment(data);
  }

  createCDATASection(data: string) {
    return new RRCDATASection(data);
  }

  createTextNode(data: string) {
    return new RRText(data);
  }

  open() {}
  close() {}
}

export class RRDocumentType extends RRNode {
  readonly name: string;
  readonly publicId: string;
  readonly systemId: string;

  constructor(qualifiedName: string, publicId: string, systemId: string) {
    super();
    this.name = qualifiedName;
    this.publicId = publicId;
    this.systemId = systemId;
  }
}

export class RRElement extends RRNode {
  tagName: string;
  attributes: Record<string, string> = {};
  scrollLeft: number = 0;
  scrollTop: number = 0;
  shadowRoot: RRElement | null = null;

  constructor(tagName: string) {
    super();
    this.tagName = tagName;
  }

  get classList() {
    return {
      add: (className: string) => {},
    };
  }

  get textContent() {
    return '';
  }

  set textContent(newText: string) {}

  get style() {
    const style = (this.attributes.style
      ? parseCSSText(this.attributes.style)
      : {}) as Record<string, string> & {
      setProperty: (
        name: string,
        value: string | null,
        priority?: string | null,
      ) => void;
    };
    style.setProperty = (name: string, value: string | null) => {
      const normalizedName = camelize(name);
      if (!value) delete style[normalizedName];
      else style[normalizedName] = value;
      this.attributes.style = toCSSText(style);
    };
    return style;
  }

  setAttribute(name: string, attribute: string) {
    this.attributes[name] = attribute;
  }

  setAttributeNS(
    _namespace: string | null,
    qualifiedName: string,
    value: string,
  ): void {
    this.setAttribute(qualifiedName, value);
  }

  removeAttribute(name: string) {
    delete this.attributes[name];
  }

  appendChild(newChild: RRNode): RRNode {
    this.children.push(newChild);
    newChild.parentNode = this;
    newChild.parentElement = this;
    return newChild;
  }

  insertBefore(newChild: RRNode, refChild: RRNode | null): RRNode {
    if (refChild === null) return this.appendChild(newChild);
    const childIndex = this.children.indexOf(refChild);
    if (childIndex == -1)
      throw new Error(
        "Failed to execute 'insertBefore' on 'RRNode': The RRNode before which the new node is to be inserted is not a child of this RRNode.",
      );
    this.children.splice(childIndex, 0, newChild);
    return newChild;
  }

  querySelectorAll(selectors: string): RRElement[] {
    return [];
  }

  getElementsByTagName(tagName: string): RRElement[] {
    let elements: RRElement[] = [];
    if (this instanceof RRElement && this.tagName === tagName)
      elements.push(this);
    for (const child of this.children) {
      if (child instanceof RRElement)
        elements = elements.concat(child.getElementsByTagName(tagName));
    }
    return elements;
  }

  /**
   * Creates a shadow root for element and returns it.
   */
  attachShadow(init: ShadowRootInit): RRElement {
    this.shadowRoot = init.mode === 'open' ? this : null;
    return this;
  }
}

export class RRImageElement extends RRElement {
  src: string;
  width: number;
  height: number;
  onload: ((this: GlobalEventHandlers, ev: Event) => any) | null;
}

export class RRMediaElement extends RRElement {
  currentTime: number;
  paused: boolean;
  async play() {
    this.paused = false;
  }
  async pause() {
    this.paused = true;
  }
}

export class RRIframeElement extends RRElement {
  width: string;
  height: string;
  src: string;
  contentDocument: RRDocument;
  contentWindow: RRWindow;

  constructor(tagName: string) {
    super(tagName);
    this.contentDocument = new RRDocument();
    this.contentWindow = new RRWindow();
  }
}

export class RRText extends RRNode {
  textContent: string;

  constructor(data: string) {
    super();
    this.textContent = data;
  }
}

export class RRComment extends RRNode {
  data: string;

  constructor(data: string) {
    super();
    this.data = data;
  }
}
export class RRCDATASection extends RRNode {
  data: string;

  constructor(data: string) {
    super();
    this.data = data;
  }
}

interface RRElementTagNameMap {
  img: RRImageElement;
  audio: RRMediaElement;
  video: RRMediaElement;
}

type RRElementType<
  K extends keyof HTMLElementTagNameMap
> = K extends keyof RRElementTagNameMap ? RRElementTagNameMap[K] : RRElement;
