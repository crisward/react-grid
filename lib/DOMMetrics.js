/**
 * @jsx React.DOM
 * @copyright Prometheus Research, LLC 2014
 */
'use strict';

var React               = require('react');
var emptyFunction       = require('./emptyFunction');
var shallowCloneObject  = require('./shallowCloneObject');
var invariant           = require('./invariant');

var contextTypes = {
  metricsComputator: React.PropTypes.object
};

var MetricsComputatorMixin = {

  childContextTypes: contextTypes,

  getChildContext() {
    return {metricsComputator: this};
  },

  getMetricImpl(name) {
    return this._DOMMetrics.metrics[name].value;
  },

  registerMetricsImpl(component, metrics) {
    var getters = {};
    var s = this._DOMMetrics;

    for (var name in metrics) {
      invariant(
          s.metrics[name] === undefined,
          'DOM metric ' + name + ' is already defined'
      );
      s.metrics[name] = {component, computator: metrics[name].bind(component)};
      getters[name] = this.getMetricImpl.bind(null, name);
    }

    if (s.components.indexOf(component) === -1) {
      s.components.push(component);
    }

    return getters;
  },

  unregisterMetricsFor(component) {
    var s = this._DOMMetrics;
    var idx = s.components.indexOf(component);

    if (idx > -1) {
      s.components.splice(idx, 1);

      var name;
      var metricsToDelete = {};

      for (name in s.metrics) {
        if (s.metrics[name].component === component) {
          metricsToDelete[name] = true;
        }
      }

      for (name in metricsToDelete) {
        delete s.metrics[name];
      }
    }
  },

  updateMetrics() {
    var s = this._DOMMetrics;

    var needUpdate = false;

    for (var name in s.metrics) {
      var newMetric = s.metrics[name].computator();
      if (newMetric !== s.metrics[name].value) {
        needUpdate = true;
      }
      s.metrics[name].value = newMetric;
    }

    if (needUpdate) {
      for (var i = 0, len = s.components.length; i < len; i++) {
        if (s.components[i].metricsUpdated) {
          s.components[i].metricsUpdated();
        }
      }
    }
  },

  componentWillMount() {
    this._DOMMetrics = {
      metrics: {},
      components: []
    };
  },

  componentDidMount() {
    if (window.jQuery)
      $( window ).resize(this.updateMetrics);
    else
      window.addEventListener('resize', this.updateMetrics);
    this.updateMetrics();
  },

  componentWillUnmount() {
    if (window.jQuery)
      $(window).off("resize");
    else
      window.removeEventListener('resize', this.updateMetrics);
  }

};

var MetricsMixin = {

  contextTypes: contextTypes,

  componentWillMount() {
    if (this.DOMMetrics) {
      this._DOMMetricsDefs = shallowCloneObject(this.DOMMetrics);

      this.DOMMetrics = {};
      for (var name in this._DOMMetricsDefs) {
        this.DOMMetrics[name] = emptyFunction;
      }
    }
  },

  componentDidMount() {
    if (this.DOMMetrics) {
      this.DOMMetrics = this.registerMetrics(this._DOMMetricsDefs);
    }
  },

  componentWillUnmount() {
    if (!this.registerMetricsImpl) {
      return this.context.metricsComputator.unregisterMetricsFor(this);
    }
    if (this.hasOwnProperty('DOMMetrics')) {
        delete this.DOMMetrics;
    }
  },

  registerMetrics(metrics) {
    if (this.registerMetricsImpl) {
      return this.registerMetricsImpl(this, metrics);
    } else {
      return this.context.metricsComputator.registerMetricsImpl(this, metrics);
    }
  },

  getMetric(name) {
    if (this.getMetricImpl) {
      return this.getMetricImpl(name);
    } else {
      return this.context.metricsComputator.getMetricImpl(name);
    }
  }
};

module.exports = {
  MetricsComputatorMixin,
  MetricsMixin
};
