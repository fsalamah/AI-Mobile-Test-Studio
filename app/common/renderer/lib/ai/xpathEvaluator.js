import xpath from 'xpath';
import { DOMParser, XMLSerializer } from 'xmldom';

export const evaluateXPath =(xmlString, xpathExpr) => {
  let result = {
    xpathExpression: xpathExpr,
    numberOfMatches: 0,
    matchingNodes: [],
    isValid: true,
  };

  try {
    const doc = new DOMParser().parseFromString(xmlString, 'text/xml');
    const nodes = xpath.select(xpathExpr, doc);

    result.numberOfMatches = nodes.length;

    const serializer = new XMLSerializer();
    result.matchingNodes = nodes.map(node => serializer.serializeToString(node));

  } catch (error) {
    result.isValid = false;
  }

  return result;
}


