/* librato (http://dev.librato.com/v1/post/metrics) source */
cubism_contextPrototype.librato = function(user, token) { // librato = context.librato(user, token)
  var source      = {},
      context     = this;
      auth_string = "Basic " + btoa(user + ":" + token);
      enable_log  = true;

  function log(msg) { if (enable_log) console.log(msg); }

  /* All the logic to query the libratp API is here */
  var librato_request = function(metric, source) {
    var resolution   = 60; // 1 sec; 60 sec;
        url_prefix   = "https://metrics-api.librato.com/v1/metrics";

    function make_url(sdate, edate) {
      var params     = "start_time=" + sdate + "&end_time=" + edate + "&resolution=" + resolution;
          full_url   = url_prefix + "/" + metric + "?" + params;

      log("full_url = " + full_url);
      return full_url;
    }

    /* Resolution between librato and cubism maybe different */
    function adjust_resolution(isdate, iedate, step, librato_mm) {
      var av = [];

      /*
      while (isdate < iedate) {
        isdate += step;
        av.push(Math.random());
      }
      */

      for (i=isdate; i<=iedate; i+=step) {
        var int_mes = [];
        while (librato_mm.length && librato_mm[0].measure_time <= i) {
          int_mes.push(librato_mm.shift().value);
        }
        if (int_mes.length) {
          var sum = int_mes.reduce(function(a, b) { return a + b });
          av.push(sum / int_mes.length);
        } else { // No librato values on that interval
          av.push(av[av.length-1]);
        }
      }

      return av;
    }

    request = {};

    request.fire = function(isdate, iedate, step, callback_done) {
      var a_values = []; /* Store partial values from librato */

      function actual_request(full_url) {
        d3.json(full_url)
          .header("X-Requested-With", "XMLHttpRequest")
          .header("Authorization", auth_string)
          .get(function (error, data) { /* Callback; data available */
            if (!error) {
              log("# of partial measurements: " + data.measurements[source].length);
              //data.measurements[source].forEach(function(o) { a_values.push(o.value); });
              data.measurements[source].forEach(function(o) { a_values.push(o); });

              var still_more_values = 'query' in data && 'next_time' in data.query;
              if (still_more_values) {
                log("Requesting more values");
                actual_request(make_url(data.query.next_time, iedate));
              } else {
                log("total number of measurements from librato: " + a_values.length);
                var a_adjusted = adjust_resolution(isdate, iedate, step, a_values);
                log("number of measurements after adjusting resolution: " + a_adjusted.length);
                callback_done(a_adjusted);
              }
            } else {
              log("There was an error when performing the librato request:");
              log(error);
            }
          });
      }

      actual_request(make_url(isdate, iedate));
    };

    return request;
  };


  source.metric = function(m_name, m_source) { // librato.metric("hgsc_active_jobs", "ardmore")
    return context.metric(function(start, stop, step, callback) {
      log("START: " + start + "; STOP: " + stop + "; STEP: " + step);
      log("START: " + cubism_libratoFormatDate(start) +
                  "; STOP: " + cubism_libratoFormatDate(stop) +
                  "; STEP: " + cubism_libratoFormatDate(step));
      var nes_num_mes = (cubism_libratoFormatDate(stop) - cubism_libratoFormatDate(start))/cubism_libratoFormatDate(step);
      log("# of measurements necessary: " + nes_num_mes);
      librato_request(m_name, m_source)
        .fire(cubism_libratoFormatDate(start),
              cubism_libratoFormatDate(stop),
              cubism_libratoFormatDate(step),
              function(a_values) { callback(null, a_values); });

      }, m_name += "");
    };

  // TODO: Returns the librato host ?
  source.toString = function() {
    return "host here ??";
  };

  return source;
};

var cubism_libratoFormatDate = function(time) {
  return Math.floor(time / 1000);
};
