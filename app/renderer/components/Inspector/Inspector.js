import React, { Component } from 'react';
import ReactDOM from 'react-dom';
import { Card, Icon, Button, Spin, Tooltip } from 'antd';
import Screenshot from './Screenshot';
import SelectedElement from './SelectedElement';
import Source from './Source';
import SourceScrollButtons from './SourceScrollButtons';
import InspectorStyles from './Inspector.css';
import RecordedActions from './RecordedActions';

const ButtonGroup = Button.Group;

const MIN_WIDTH = 1080;
const MIN_HEIGHT = 570;

export default class Inspector extends Component {

  constructor () {
    super();
    this.didInitialResize = false;
    this.state = {};
  }

  componentWillMount () {
    const curHeight = window.innerHeight;
    const curWidth = window.innerWidth;
    const needsResize = (curHeight < MIN_HEIGHT) || (curWidth < MIN_WIDTH);
    if (!this.didInitialResize && needsResize) {
      const newWidth = curWidth < MIN_WIDTH ? MIN_WIDTH : curWidth;
      const newHeight = curHeight < MIN_HEIGHT ? MIN_HEIGHT : curHeight;
      // resize width to something sensible for using the inspector on first run
      window.resizeTo(newWidth, newHeight);
    }
    this.didInitialResize = true;
    // this.props.bindAppium();
    this.props.applyClientMethod({methodName: 'source'});
    this.props.getSavedActionFramework();
  }

  screenshotInteractionChange (mode) {
    const {selectScreenshotInteractionMode, clearSwipeAction} = this.props;
    clearSwipeAction(); // When the action changes, reset the swipe action
    selectScreenshotInteractionMode(mode);
  }

  render () {
    const {screenshot, selectedElement = {}, quitSession, showRecord, showLocatorTestModal, screenshotInteractionMode} = this.props;
    const {path} = selectedElement;

    let main = <div className={InspectorStyles['inspector-main']}>
      <div id='screenshotContainer' className={InspectorStyles['screenshot-container']}>
        {<Screenshot {...this.props} />}
      </div>
      <div id='sourceTreeContainer' className={InspectorStyles['source-tree-container']} ref={(div) => this.container = div} >
        {showRecord &&
          <RecordedActions {...this.props} />
        }
        <Card
         title={<span><Icon type="file-text" /> App Source</span>}
         className={InspectorStyles['source-tree-card']}>
          <Source {...this.props} />
        </Card>
        {this.container && <SourceScrollButtons container={this.container} />}
      </div>
    </div>;

    let actionControls = <div className={InspectorStyles['action-controls']}>
      <ButtonGroup size="large" value={screenshotInteractionMode}>
        <Tooltip title="Select Elements">
          <Button icon='select' onClick={() => {this.screenshotInteractionChange('select');}}
            type={screenshotInteractionMode === 'select' ? 'primary' : 'default'}
          />
        </Tooltip>
        <Tooltip title="Swipe By Coordinates">
          <Button icon='swap-right' onClick={() => {this.screenshotInteractionChange('swipe');}}
            type={screenshotInteractionMode === 'swipe' ? 'primary' : 'default'}
          />
        </Tooltip>
        <Tooltip title="Tap By Coordinates">
          <Button icon='scan' onClick={() => {this.screenshotInteractionChange('tap');}}
            type={screenshotInteractionMode === 'tap' ? 'primary' : 'default'}
          />
        </Tooltip>
      </ButtonGroup>
    </div>;

    let controls = <div className={InspectorStyles['inspector-toolbar']}>
      {actionControls}
      <ButtonGroup size="large">
        <Tooltip title="Search for element">
           <Button id='searchForElement' icon="search" onClick={showLocatorTestModal}/>
        </Tooltip>
        <Tooltip title="Quit Session & Close Inspector">
          <Button id='btnClose' icon='close' onClick={() => quitSession()}/>
        </Tooltip>
      </ButtonGroup>
    </div>;

    return <div className={InspectorStyles['inspector-container']}>
      {controls}
      {main}
    </div>;
  }
}
