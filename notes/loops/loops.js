/**
 * User: Shobhit Sharma <contact@shobhitsharma.com>
 * Date: 8/14/13
 * Time: 10:06 PM
 */
(function () {
  "use strict";

  var data,
    profile,
    normal,
    lengthCheckedInForLoop,
    unrolled,
    veryUnrolled,
    print,

    iterations = 10000,
    dataSize = 10000;

  print = function (text) {
    $("#test").append(text);
  };

  data = (function () {

    var arr = [],
      i;

    for (i = 0; i < dataSize; i += 1) {
      arr.push(Math.random());
    }

    return arr;
  }());

  profile = function (fn) {

    var time = function () {
        return (new Date()).getTime();
      },
      start,
      duration,
      i;

    start = time();

    for (i = 0; i < iterations; i += 1) {
      fn();
    }

    duration = time() - start;

    print("<pre>" + fn.toString() + "</pre><p><b>Took " + duration + " miliseconds</b></p>");
  };

  normal = function () {
    var i,
      max = 0,
      len = data.length;

    for (i = 0; i < len; i += 1) {
      if (data[i] > max) {
        max = data[i];
      }
    }

    return max;
  };

  lengthCheckedInForLoop = function () {
    var i,
      max = 0;

    for (i = 0; i < data.length; i += 1) {
      if (data[i] > max) {
        max = data[i];
      }
    }

    return max;
  };

  unrolled = function () {
    var i,
      j,
      max = 0,
      len = data.length;

    for (i = 0, j = len - 1; i <= j; i += 1, j -= 1) {
      if (data[i] > max) {
        max = data[i];
      }
      if (data[j] > max) {
        max = data[j];
      }
    }

    return max;
  };

  veryUnrolled = function () {
    var i,
      max = 0,
      len = data.length;

    for (i = 0; i < len; i += 10) {
      if (data[i] > max) {
        max = data[i];
      }
      if (data[i + 1] > max) {
        max = data[i + 1];
      }
      if (data[i + 2] > max) {
        max = data[i + 2];
      }
      if (data[i + 3] > max) {
        max = data[i + 3];
      }
      if (data[i + 4] > max) {
        max = data[i + 4];
      }
      if (data[i + 5] > max) {
        max = data[i + 5];
      }
      if (data[i + 6] > max) {
        max = data[i + 6];
      }
      if (data[i + 7] > max) {
        max = data[i + 7];
      }
      if (data[i + 8] > max) {
        max = data[i + 8];
      }
      if (data[i + 9] > max) {
        max = data[i + 9];
      }
    }
  };

  profile(normal);
  profile(lengthCheckedInForLoop);
  profile(unrolled);
  profile(veryUnrolled);
}());