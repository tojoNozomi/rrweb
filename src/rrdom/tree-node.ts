import { NodeType, serializedNodeWithId } from 'rrweb-snapshot';

export abstract class RRNode {
  public __sn: serializedNodeWithId;
  public children: Array<RRNode>;
  public parentElement: RRElement | null = null;
  public parentNode: RRNode | null = null;

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

  insertBefore() {}

  contains(node: RRNode) {
    return false;
  }

  removeChild(node: RRNode) {}
}

export class RRDocument extends RRNode {
  public documentElement: RRElement;

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
    this.children.push(childNode);
    return childNode;
  }

  public createDocument(
    namespace: string | null,
    qualifiedName: string | null,
    doctype?: DocumentType | null,
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

  public createElement(tagName: string) {
    return new RRElement(tagName);
  }

  public createElementNS(
    _namespaceURI: 'http://www.w3.org/2000/svg',
    qualifiedName: string,
  ) {
    return this.createElement(qualifiedName);
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
  public attributes: Record<string, string>;
  public scrollLeft: number = 0;
  public scrollTop: number = 0;

  constructor(tagName: string) {
    super();
    this.tagName = tagName;
  }

  public setAttribute(name: string, attribute: string) {
    this.attributes[name] = attribute;
  }

  public removeAttribute(name: string) {
    delete this.attributes[name];
  }

  appendChild(newChild: RRNode): RRNode {
    this.children.push(newChild);
    return newChild;
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
