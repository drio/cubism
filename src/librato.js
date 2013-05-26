/* librato (http://dev.librato.com/v1/post/metrics) source */
cubism_contextPrototype.librato = function(user, token) { // librato = context.librato(user, token)
  var source      = {},
      context     = this;
      auth_string = "Basic " + btoa(user + ":" + token);

  console.log("user: " + user);
  console.log("token: " + token);
  console.log(auth_string);

  /* All the logic to query the libratp API is here */
  var librato_request = function(metric, source) {
    var resolution   = 60; // TODO: Dynamic
        url_prefix   = "https://metrics-api.librato.com/v1/metrics";

    function make_url(sdate, edate) {
      var params     = "start_time=" + sdate + "&end_time=" + edate + "&resolution=" + resolution;
          full_url   = url_prefix + "/" + metric + "?" + params;

      console.log("full_url = " + full_url);
      return full_url;
    }

    request = {};

    request.fire = function(isdate, iedate, callback_done) {
      var a_values = [];

      function actual_request(full_url) {
        d3.json(full_url)
          .header("X-Requested-With", "XMLHttpRequest")
          .header("Authorization", auth_string)
          .get(function (error, data) { // Callback data available
            if (!error) {
              data.measurements[source].forEach(function(o) { a_values.push(o.value); });
              var still_more_values = 'query' in data && 'next_time' in data.query;
              if (still_more_values) {
                console.log("Requesting more values");
                actual_request(make_url(data.query.next_time, iedate));
              } else {
                console.log("total number of measurements: " + a_values.length);
                callback_done(a_values);
              }
            } else {
              console.log("There was an error when performing request to librato:");
              console.log(error);
            }
          });
      }

      actual_request(make_url(isdate, iedate));
    }

    return request;
  };


  source.metric = function(m_name, m_source) { // librato.metric("hgsc_active_jobs", "ardmore")
    /*
     * TODO:
     * 1. librato's api doesn't have the _step_ feature but we have
     *    a hardcode set of values (resolution); hardcode to 60 for the moment
     * 2. pagination: Currently the API will return only 100 measurements from a metric
     */
    return context.metric(function(start, stop, step, callback) {
      // TODO: step
      librato_request(m_name, m_source)
        .fire(cubism_libratoFormatDate(start),
              cubism_libratoFormatDate(stop),
              function(a_values) { callback(null, a_values); });

      }, m_name += "");
    };

  // Returns the librato host. ??
  source.toString = function() {
    return "host here ??";
  };

  return source;
};

var cubism_libratoFormatDate = function(time) {
  return Math.floor(time / 1000);
}
