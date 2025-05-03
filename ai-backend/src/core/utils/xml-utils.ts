import { DOMParser, XMLSerializer } from 'xmldom';
import xpath from 'xpath';
import { Logger } from '../../utils/logger.js';

/**
 * Utilities for working with XML and XPath
 */
export class XmlUtils {
  /**
   * Evaluate an XPath expression against XML
   * @param xmlString XML string to evaluate against
   * @param xpathExpr XPath expression to evaluate
   * @returns Evaluation result with matching nodes and status
   */
  static evaluateXPath(xmlString: string, xpathExpr: string): XPathEvaluationResult {
    const result: XPathEvaluationResult = {
      xpathExpression: xpathExpr,
      numberOfMatches: 0,
      matchingNodes: [],
      isValid: true,
      success: true,
    };

    try {
      const doc = new DOMParser().parseFromString(xmlString, 'text/xml');
      const nodes = xpath.select(xpathExpr, doc) as Node[];

      result.numberOfMatches = nodes.length;

      // Get string representations of the matching nodes
      const serializer = new XMLSerializer();
      result.matchingNodes = nodes.map(node => {
        try {
          return serializer.serializeToString(node);
        } catch (error) {
          Logger.warn(`Error serializing node: ${error}`);
          return '[Node serialization failed]';
        }
      });

      // Trim the matching nodes list if it's too large
      if (result.matchingNodes.length > 10) {
        result.matchingNodes = result.matchingNodes.slice(0, 10);
        result.matchingNodes.push(`... and ${result.numberOfMatches - 10} more matches`);
      }
    } catch (error) {
      result.isValid = false;
      result.success = false;
      result.error = (error as Error).message;
      Logger.warn(`Error evaluating XPath "${xpathExpr}": ${error}`);
    }

    return result;
  }

  /**
   * Get element attributes from XML
   * @param xmlString XML string
   * @param xpathExpr XPath expression to identify element
   * @returns Object with element attributes
   */
  static getElementAttributes(xmlString: string, xpathExpr: string): Record<string, string> | null {
    try {
      const doc = new DOMParser().parseFromString(xmlString, 'text/xml');
      const element = xpath.select1(xpathExpr, doc) as Node;

      if (!element || element.nodeType !== 1) {
        return null;
      }

      const attributes: Record<string, string> = {};
      const nodeElement = element as Element;
      
      if (nodeElement.attributes) {
        for (let i = 0; i < nodeElement.attributes.length; i++) {
          const attr = nodeElement.attributes[i];
          attributes[attr.name] = attr.value;
        }
      }

      return attributes;
    } catch (error) {
      Logger.warn(`Error getting element attributes: ${error}`);
      return null;
    }
  }

  /**
   * Get XML element text content
   * @param xmlString XML string
   * @param xpathExpr XPath expression to identify element
   * @returns Text content of the element
   */
  static getElementText(xmlString: string, xpathExpr: string): string | null {
    try {
      const doc = new DOMParser().parseFromString(xmlString, 'text/xml');
      const element = xpath.select1(xpathExpr, doc) as Node;

      if (!element) {
        return null;
      }

      // Get text content recursively
      return this.getNodeText(element);
    } catch (error) {
      Logger.warn(`Error getting element text: ${error}`);
      return null;
    }
  }

  /**
   * Get text content of a node
   * @param node XML node
   * @returns Text content of the node
   */
  private static getNodeText(node: Node): string {
    if (node.nodeType === 3) { // Text node
      return node.nodeValue || '';
    }

    let text = '';
    if (node.childNodes) {
      for (let i = 0; i < node.childNodes.length; i++) {
        text += this.getNodeText(node.childNodes[i]);
      }
    }

    return text.trim();
  }

  /**
   * Simplify XML by removing deep nesting
   * @param xmlString XML string to simplify
   * @param maxDepth Maximum depth to keep
   * @returns Simplified XML string
   */
  static simplifyXml(xmlString: string, maxDepth: number = 10): string {
    try {
      const doc = new DOMParser().parseFromString(xmlString, 'text/xml');
      this.pruneDeepNodes(doc.documentElement, 0, maxDepth);
      
      const serializer = new XMLSerializer();
      return serializer.serializeToString(doc);
    } catch (error) {
      Logger.warn(`Error simplifying XML: ${error}`);
      return xmlString;
    }
  }

  /**
   * Recursively prune deep nodes
   * @param node Current node
   * @param currentDepth Current depth
   * @param maxDepth Maximum depth
   */
  private static pruneDeepNodes(node: Node | null, currentDepth: number, maxDepth: number): void {
    if (!node || !node.childNodes) {
      return;
    }

    if (currentDepth >= maxDepth) {
      // Remove all children but keep the node itself
      while (node.childNodes.length > 0) {
        node.removeChild(node.childNodes[0]);
      }
      
      // Add a placeholder text node
      if (node.nodeType === 1) { // Element node
        const placeholder = node.ownerDocument.createTextNode('[...]');
        node.appendChild(placeholder);
      }
      
      return;
    }

    // Process children recursively
    const childNodes = Array.from(node.childNodes);
    for (const child of childNodes) {
      this.pruneDeepNodes(child, currentDepth + 1, maxDepth);
    }
  }
}

/**
 * Result of XPath evaluation
 */
export interface XPathEvaluationResult {
  xpathExpression: string;
  numberOfMatches: number;
  matchingNodes: string[];
  isValid: boolean;
  success: boolean;
  error?: string;
}