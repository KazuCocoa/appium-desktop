import React, { Component } from 'react';
import ReactDOM from 'react-dom';
import { debounce } from 'lodash';
import HighlighterRect from './HighlighterRect';
import B from 'bluebird';
import { parseCoordinates } from './shared';
import {getOptimalXPath} from "../../util";

/**
 * Shows screenshot of running application and divs that highlight the elements' bounding boxes
 */
export default class HighlighterRects extends Component {

  constructor (props) {
    super(props);
    this.state = {
      scaleRatio: 1,
    };
    this.updateScaleRatio = debounce(this.updateScaleRatio.bind(this), 1000);
  }

  // TODO: 重複
  /**
   * Translates sourceXML to JSON
   */
  xmlToJSON (source) {
    const uniqueAttributes = [
      'name',
      'content-desc',
      'id',
      'accessibility-id'
    ];

    let xmlDoc;
    let recursive = (xmlNode, parentPath, index) => {

      // Translate attributes array to an object
      let attrObject = {};
      for (let attribute of xmlNode.attributes || []) {
        attrObject[attribute.name] = attribute.value;
      }

      // Dot Separated path of indices
      let path = (index !== undefined) && `${!parentPath ? '' : parentPath + '.'}${index}`;

      return {
        children: [...xmlNode.children].map((childNode, childIndex) => recursive(childNode, path, childIndex)),
        tagName: xmlNode.tagName,
        attributes: attrObject,
        xpath: getOptimalXPath(xmlDoc, xmlNode, uniqueAttributes),
        path,
      };
    };

    xmlDoc = (new DOMParser()).parseFromString(source, 'text/xml');
    let sourceXML = xmlDoc.children[0];
    return recursive(sourceXML);
  }
  loadXml () {
    const fs = require('fs');
    let s = fs.readFileSync('/Users/kazuaki/GitHub/appium-desktop/sample/source.xml', {encoding: 'utf-8'});

    return this.xmlToJSON(s);
  }

  /**
   * Calculates the ratio that the image is being scaled by
   */
  updateScaleRatio () {
    const screenshotEl = this.props.containerEl.querySelector('img');

    // now update scale ratio
    const {x1, x2} = parseCoordinates(this.loadXml().children[0].children[0]);
    this.setState({
      scaleRatio: (x2 - x1) / screenshotEl.offsetWidth
    });

  }

  async handleScreenshotClick () {
    const {screenshotInteractionMode, applyClientMethod, 
      swipeStart, swipeEnd, setSwipeStart, setSwipeEnd} = this.props;
    const {x, y} = this.state;

    if (screenshotInteractionMode === 'tap') {
      applyClientMethod({
        methodName: 'tap',
        args: [x, y],
      });
    } else if (screenshotInteractionMode === 'swipe') {
      if (!swipeStart) {
        setSwipeStart(x, y);
      } else if (!swipeEnd) {
        setSwipeEnd(x, y);
        await B.delay(500); // Wait a second to do the swipe so user can see the SVG line
        await this.handleDoSwipe();
      }
    }
  }

  handleMouseMove (e) {
    const {screenshotInteractionMode} = this.props;
    const {scaleRatio} = this.state;

    if (screenshotInteractionMode !== 'select') {
      const offsetX = e.nativeEvent.offsetX;
      const offsetY = e.nativeEvent.offsetY;
      const x = offsetX * scaleRatio;
      const y = offsetY * scaleRatio;
      this.setState({
        ...this.state,
        x: Math.round(x),
        y: Math.round(y),
      });
    }
  }

  handleMouseOut () {
    this.setState({
      ...this.state,
      x: null,
      y: null,
    });
  }

  async handleDoSwipe () {
    const {swipeStart, swipeEnd, clearSwipeAction, applyClientMethod} = this.props;
    await applyClientMethod({
      methodName: 'swipe',
      args: [swipeStart.x, swipeStart.y, swipeEnd.x - swipeStart.x, swipeEnd.y - swipeStart.y],
    });
    clearSwipeAction();
  }

  componentDidMount () {
    // When DOM is ready, calculate the image scale ratio and re-calculate it whenever the window is resized
    this.updateScaleRatio();
    window.addEventListener('resize', this.updateScaleRatio);
  }

  componentWillUnmount () {
    window.removeEventListener('resize', this.updateScaleRatio);
  }

  render () {
    const {source, screenshotInteractionMode, containerEl, searchedForElementBounds, isLocatorTestModalVisible} = this.props;
    const {scaleRatio} = this.state;

    // Recurse through the 'source' JSON and render a highlighter rect for each element
    const highlighterRects = [];

    let highlighterXOffset = 0;
    if (containerEl) {
      const screenshotEl = containerEl.querySelector('img');
      highlighterXOffset = screenshotEl.getBoundingClientRect().left -
                           containerEl.getBoundingClientRect().left;
    }

    let recursive = (element, zIndex = 0) => {
      if (!element) {
        return;
      }
      highlighterRects.push(<HighlighterRect {...this.props}
        element={element}
        zIndex={zIndex}
        scaleRatio={scaleRatio}
        key={element.path}
        xOffset={highlighterXOffset}
      />);

      for (let childEl of element.children) {
        recursive(childEl, zIndex + 1);
      }
    };

    // If the use selected an element that they searched for, highlight that element
    if (searchedForElementBounds && isLocatorTestModalVisible) {
      const {location:elLocation, size} = searchedForElementBounds;
      highlighterRects.push(<HighlighterRect elSize={size} elLocation={elLocation} scaleRatio={scaleRatio} xOffset={highlighterXOffset} />);
    }

    // If we're tapping or swiping, show the 'crosshair' cursor style
    const screenshotStyle = {};
    if (screenshotInteractionMode === 'tap' || screenshotInteractionMode === 'swipe') {
      screenshotStyle.cursor = 'crosshair';
    }

    // Don't show highlighter rects when Search Elements modal is open
    if (!isLocatorTestModalVisible) {
      recursive(source);
    }

    return <div>{ highlighterRects }</div>;
  }
}
