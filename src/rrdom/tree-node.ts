import { NodeType, serializedNodeWithId } from 'rrweb-snapshot';
import { parseCSSText, camelize, toCSSText } from './style';

export abstract class RRNode {
  public __sn: serializedNodeWithId;
  public children: Array<RRNode>;
  public parentElement: RRElement | null = null;
  public parentNode: RRNode | null = null;
  public ELEMENT_NODE = 1;
  public TEXT_NODE = 3;

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

  abstract appendChild(newChild: RRNode): RRNode;

  insertBefore() {
    throw new Error('Not implemented yet.');
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

export class RRDocument extends RRNode {
  public documentElement: RRElement;
  public implementation = this;

  public appendChild(childNode: RRNode) {
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
    if (childNode instanceof RRElement && childNode.tagName === 'html')
      this.documentElement = childNode;
    return childNode;
  }

  public createDocument(
    _namespace: string | null,
    _qualifiedName: string | null,
    _doctype?: DocumentType | null,
  ) {
    return new RRDocument();
  }

  public createDocumentType(
    qualifiedName: string,
    publicId: string,
    systemId: string,
  ) {
    return new RRDocumentType(qualifiedName, publicId, systemId);
  }

  public createElement<K extends keyof HTMLElementTagNameMap>(
    tagName: K,
  ): RRElementType<K>;
  public createElement(tagName: string): RRElement;
  public createElement(tagName: string) {
    const lowerTagName = tagName.toLowerCase();
    if (lowerTagName === 'img') return new RRImageElement('img');
    if (lowerTagName === 'audio' || lowerTagName === 'video')
      return new RRMediaElement(lowerTagName);
    return new RRElement(lowerTagName);
  }

  public createElementNS(
    _namespaceURI: 'http://www.w3.org/2000/svg',
    qualifiedName: string,
  ) {
    return this.createElement(qualifiedName as keyof HTMLElementTagNameMap);
  }

  public createComment(data: string) {
    return new RRComment(data);
  }

  public createCDATASection(data: string) {
    return new RRCDATASection(data);
  }

  public createTextNode(data: string) {
    return new RRText(data);
  }

  public open() {}
  public close() {}
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

  appendChild(_newChild: RRNode): RRNode {
    throw new Error(
      `RRDomException: Failed to execute 'appendChild' on 'RRNode': This RRNode type does not support this method.`,
    );
  }
}

export class RRElement extends RRNode {
  public tagName: string;
  public attributes: Record<string, string> = {};
  public scrollLeft: number = 0;
  public scrollTop: number = 0;
  public shadowRoot: RRElement | null = null;

  constructor(tagName: string) {
    super();
    this.tagName = tagName;
  }

  get style() {
    const style = parseCSSText(this.attributes.style) as Record<
      string,
      string
    > & {
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

  public setAttribute(name: string, attribute: string) {
    this.attributes[name] = attribute;
  }

  public setAttributeNS(
    _namespace: string | null,
    qualifiedName: string,
    value: string,
  ): void {
    this.setAttribute(qualifiedName, value);
  }

  public removeAttribute(name: string) {
    delete this.attributes[name];
  }

  public appendChild(newChild: RRNode): RRNode {
    this.children.push(newChild);
    newChild.parentNode = this;
    newChild.parentElement = this;
    return newChild;
  }

  /**
   * Creates a shadow root for element and returns it.
   */
  public attachShadow(init: ShadowRootInit): RRElement {
    this.shadowRoot = init.mode === 'open' ? this : null;
    return this;
  }
}

export class RRImageElement extends RRElement {
  public src: string;
  public width: number;
  public height: number;
  public onload: ((this: GlobalEventHandlers, ev: Event) => any) | null;
}

export class RRMediaElement extends RRElement {
  public currentTime: number;
  public paused: boolean;
  public async play() {
    this.paused = false;
  }
  public async pause() {
    this.paused = true;
  }
}

export class RRText extends RRNode {
  public textContent: string;

  constructor(data: string) {
    super();
    this.textContent = data;
  }

  appendChild(_newChild: RRNode): RRNode {
    throw new Error(
      `RRDomException: Failed to execute 'appendChild' on 'RRNode': This RRNode type does not support this method.`,
    );
  }
}

export class RRComment extends RRNode {
  public data: string;

  constructor(data: string) {
    super();
    this.data = data;
  }

  appendChild(_newChild: RRNode): RRNode {
    throw new Error(
      `RRDomException: Failed to execute 'appendChild' on 'RRNode': This RRNode type does not support this method.`,
    );
  }
}
export class RRCDATASection extends RRNode {
  public data: string;

  constructor(data: string) {
    super();
    this.data = data;
  }

  appendChild(_newChild: RRNode): RRNode {
    throw new Error(
      `RRDomException: Failed to execute 'appendChild' on 'RRNode': This RRNode type does not support this method.`,
    );
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
