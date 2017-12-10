import React from 'react';
import { Route, IndexRoute } from 'react-router';
import App from './containers/App';
import InspectorPage from './containers/InspectorPage';

export default (
  <Route path="/" component={App}>
    <IndexRoute component={StartServerPage} />
    <Route path="inspector" component={InspectorPage} />
  </Route>
);
