'use strict';
var app = angular.module('modelr', 
	['mgcrea.ngStrap', 
	'ngAnimate',
	'angular-flexslider']);

app.config(['$interpolateProvider', function($interpolateProvider) {
  $interpolateProvider.startSymbol('{[');
  $interpolateProvider.endSymbol(']}');
}]);

app.directive('jqColorpicker', function(){
  var linkFn = function(scope,element,attrs){
    element.colorpicker().on('changeColor.colorpicker', function(event){
      var child = d3.select(scope.top[0][0].childNodes[0]);
      var parentClass = d3.select(scope.top[0][0]).attr('class');
      scope.$parent.pathColors[parentClass] = event.color.toHex();
      child.style('fill', event.color.toHex());
      $(event.currentTarget).css('background-color', event.color.toHex());
    });
  }

  return {
      restrict:'A',
      link: linkFn
  }
});
app.controller('2DCtrl', function ($scope, $http, $alert, $timeout) {

  $scope.setDefaults = function(){
    $scope.zDomain = ['depth','time'];
    $scope.zAxisDomain = 'depth';
    $scope.zRange = 1000;

    // TODO update from mouse over on seismic plots
    $scope.trace = 1;
    $scope.traceStr = "1";
    $scope.offset = 1;
    $scope.offsetNum = 3;
    $scope.offsetStr = "1";
    $scope.twt = 0;
    $scope.twtStr = "0";
    $scope.gain = 1;
    $scope.twt = 0;
    $scope.gainStr = "1";
    $scope.maxGain = "10";
    $scope.frequency = 20;
    $scope.phase = 0.0;
    $scope.phaseStr = "0";
    $scope.snr = 50;
    $scope.snrStr = "50";
    $scope.frequencyNum = 20.72;
    $scope.colorRange = ['#FF0000', '#FFF', '#0000FF'];
    
    $http.get('/backend_url').then(function(response) {
      $scope.server = response.data.hostname;
    });
    
    $scope.theta = [0, 3, 6, 9, 12, 15, 18, 21, 24, 27, 30];
    $scope.popover = {
     title: "Models",
     content: "Choose a model framework from the carousel below, or use the buttons to the right to upload an image or create a new model with the model builder. then assign the model's rocks and other parameters in the panel to the right."
    };
  };

  $scope.setColorPickers = function(){
    for(var i = 0; i < $scope.colorRange.length; i++){
      var colorp = $('.s-color-' + i).colorpicker()
        .on('changeColor.colorpicker', function(event){
          var index = event.currentTarget.attributes["data-index"].value;
          $(event.currentTarget).css('background-color', $scope.colorRange[index]);
          $scope.colorRange[index] = event.color.toHex();
      });
    }
  };

  $scope.removeColor = function(index){
    $scope.colorRange.splice(index, 1);
    $scope.colorDomain.splice(index, 1);
  };

  $scope.addColor = function(){
    $scope.colorRange.push('#FFF');
    $scope.colorDomain.push(0);
    $timeout($scope.setColorPickers, 300);
  };


  $scope.fetchImageModels = function(){

    var hash = window.location.hash.substring(1);
    if (hash != ''){
      var params = hash.split('&');
      var image_key = params[0].split('=')[1];

      if(params.length > 1){
        var name = decodeURIComponent(params[1].split('=')[1]);
      }
    }
    
    $http.get('/image_model?all')
      .then(function(response) {
        var images = response.data;
        $scope.images = [];

        if(images.length > 0){
        for(var i = 0; i < images.length; i++){
          var loopIndex = i;
          if(image_key && images[i].key === image_key){
            $scope.images.unshift(images[i]);
            loopIndex = 0;
          } else{
            $scope.images.push(images[i]);
          };

    	    $scope.images[loopIndex].rocks = [];
    	    for(var j = 0; j < $scope.images[loopIndex].colours.length; j++){
    	      var rand = $scope.rocks[Math.floor(Math.random() * $scope.rocks.length)];
            $scope.images[loopIndex].rocks.push(rand);
    	    }
	       }
          $scope.curImage = $scope.images[0];
        }

        if(name){
          for(var i=0; $scope.curImage.earth_models; i++){
            var em = $scope.curImage.earth_models[i];
            if(em.name === name){
              $scope.savedEarthModel = em;
              $scope.loadSaved();
            }
          }
        }
      }
    );
  };
 
  $scope.fetchRocks = function(){
    $http.get('/rock?all').
      then(function(response) {
        $scope.rocks = response.data;
      }
    );
  };

  $scope.loadSaved = function(){
    var arr = $.map($scope.savedEarthModel.mapping, function(value, index) {
      return [value];
    });

    for(var h =0; h < $scope.curImage.colours.length; h++){
      var curColour = $scope.curImage.colours[h];

      dataloop:
      for(var i = 0; i < arr.length; i++){
        rockloop:
        for(var j = 0; j < $scope.rocks.length; j++){
          if((arr[i].rock.db_key === $scope.rocks[j].db_key) &&
             (arr[i].colour === curColour)){
            $scope.curImage.rocks[h] = $scope.rocks[j];
            break dataloop;
          }
        }
      }
    }
  };
  
  $scope.slideClick = function(slider){
    $scope.curImage = $scope.images[slider.element.currentSlide];
  };

  $scope.update_data = function(){
    if($scope.updateClicked === undefined){
      $('#loader').show();
    }

    var earth_model = $scope.makeEarthModelStruct();
    $("html, body").scrollTop($("#plot_header").offset().top);
      
    var seismic = {
      frequency: $scope.frequencyNum,
      wavelet: "ricker", 
      dt: 0.001,
      phase: $scope.phase,
      snr: $scope.snr
    };

    var data = {
      seismic: seismic,
      earth_model: earth_model,
      trace: $scope.trace,
      offset: $scope.offset
    };

    var payload = JSON.stringify(data);
      $http.get($scope.server + '/data.json?type=seismic&script=convolution_model.py&payload=' + payload)
        .then(function(response){

          // set better horizon defaults
          if($scope.updateClicked === undefined){
            
             $scope.twt = (response.data.seismic.length / 2) * response.data.dt;
          };
          console.log(response.data);
          $scope.plot(response.data);
          $scope.maxTrace = String(response.data.seismic.length - 1);
          $scope.maxTWT = String((response.data.seismic[0].length - 1) * response.data.dt);
          $scope.maxOffset = String(response.data.offset_gather.length - 1);
          $scope.updateClicked = true;
          $('#loader').hide();
        }
      );
  };

  $scope.changeTraceStr = function(){
    $scope.trace = Number($scope.traceStr);
    var arr = [$scope.data.seismic[$scope.trace]];
    $scope.vDLog
      .xTrans($scope.trace)
      .reDraw(
        arr, 
        [0, $scope.data.seismic.length - 1], 
        [0, ($scope.data.seismic[0].length - 1) * $scope.data.dt]
      );
  };

  $scope.changeTWTStr = function(){
    $scope.twt = Number($scope.twtStr);
    $scope.updateTWT();
  };

  $scope.updateTWT = function(){
    // Update Horizons
    var arr = [];
    for(var i = 0; i < $scope.data.seismic.length; i++){ arr.push($scope.twt); }
    $scope.vDHor.reDraw(arr);

    arr = [];
    for(var i = 0; i < $scope.data.offset_gather.length; i++){ arr.push($scope.twt); }
    $scope.oGHor.reDraw(arr);

    arr = [];
    for(var i = 0; i < $scope.data.wavelet_gather.length; i++){ arr.push($scope.twt); }
    $scope.wGHor.reDraw(arr);

    $scope.aTArr = getCrossSection($scope.data.seismic, $scope.twt,
                                   $scope.data.dt);
    $scope.aOArr = getCrossSection($scope.data.offset_gather, $scope.twt,
                                   $scope.data.dt);
    $scope.aFArr = getCrossSection($scope.data.wavelet_gather, $scope.twt,
                                   $scope.data.dt);

    $scope.aTHor.reDraw($scope.aTArr);
    $scope.aOHor.reDraw($scope.aOArr);
    $scope.aFHor.reDraw($scope.aFArr);
  };

  $scope.changeGainStr = function(){
    $scope.gain = Number($scope.gainStr);
    $scope.updateTWT();
  };

  $scope.changeOffsetStr = function(){
    $scope.offset = Number($scope.offsetStr);
    $scope.offsetNum = $scope.offset * 3;
    var arr = [$scope.data.offset_gather[$scope.offset]];
    $scope.oGLog
      .xTrans($scope.offset)
      .reDraw(
        arr, 
        [0, $scope.data.offset_gather.length - 1], 
        [0, ($scope.data.offset_gather[0].length - 1) * $scope.data.dt]
      );
  };

  $scope.changeFrequencyStr = function(){
    $scope.frequency = Number($scope.frequencyStr);
    $scope.frequencyNum = $scope.data.f[$scope.frequency];
    var arr = [$scope.data.wavelet_gather[$scope.frequency]];
    $scope.wGLog
      .xTrans($scope.frequency)
      .reDraw(
        arr, 
        [0, $scope.data.wavelet_gather.length - 1], 
        [0, ($scope.data.wavelet_gather[0].length - 1) * $scope.data.dt]
      );
  };

  $scope.changePhaseStr = function(){
    $scope.phase = Number($scope.phaseStr);
  };

  $scope.changeNoiseStr = function(){
    $scope.snr = Number($scope.snrStr);
  };

  $scope.plotSeismic = function(data, height, max){
    // Variable Density Plot
    var width = $('.vd_plot').width();
    if(!$scope.vDPlot){
      $scope.vDPlot = g3.plot('.vd_plot')
        .height(height)
        .xTitle("spatial cross-section")
        .yTitle("time [ms]")
        .width(width - 30)
        .xTickFormat("")
        .x2TickFormat("")
        .y2TickFormat("")
        .margin(20,10,5,40)
        .xDomain([0, data.seismic.length - 1])
        .yDomain([0, (data.seismic[0].length - 1) * data.dt])
        .draw();
    } else {
      $scope.vDPlot.reDraw(
        [0, data.seismic.length - 1], 
        [0, (data.seismic[0].length - 1) * data.dt]
      );
    }
    // Draw Seismic Image
    if(!$scope.seis){
      $scope.seis = g3.seismic($scope.vDPlot, [data.seismic])
        .max(max)
        .nDColorMap([$scope.colorScale])
        .gain($scope.gain)
        .draw();
    } else {
      $scope.seis
        .gain($scope.gain)
        .nDColorMap([$scope.colorScale])
        .reDraw([data.seismic]);
    }
  };
  
  $scope.plotVDHorizon = function(data){
    var xScale = $scope.vDPlot.xScale();
    var yScale = $scope.vDPlot.yScale();
    var arr = [];
    for(var i = 0; i < data.seismic.length; i++){
      arr.push($scope.twt);
    }
    if(!$scope.vDHor){ 
      $scope.vDHor = g3.horizon($scope.vDPlot, arr).yInt(data.dt).draw();

      // Register drag trigger for wGWigLine
      var wigLineDrag = d3.behavior.drag()
        .on('drag', vDWigLineRedraw);

      // Register drag trigger for wGHorLine
      var horLineDrag = d3.behavior.drag()
      .on('drag', vDHorLineRedraw);

      // Draw invisible line
      $scope.vDWigLine = g3.handle.line(
        $scope.vDPlot, 
        $scope.trace, 
        (data.seismic[0].length - 1)*data.dt,
        $scope.trace,
        0)
        .class('vdwigline')
        .draw();
      $scope.vDWigLine.line().call(wigLineDrag);

      // Draw invisible horizon line
      $scope.vDHorLine = g3.handle.line($scope.vDPlot, 0, 
        $scope.twt, data.seismic.length - 1, $scope.twt).draw();
      $scope.vDHorLine.line().call(horLineDrag);

      // Register mouseup trigger for wgline
      $(".vdwigline").mouseup(function(e){
        e.preventDefault();
        $scope.update_data();
      });
    } else {
      // Redraw the invisible line
      $scope.vDWigLine.reDraw($scope.trace,
                              (data.seismic[0].length - 1) * data.dt,
                              $scope.trace, 0);
      // Redraw invisible horizon
      $scope.vDHorLine.reDraw(0, $scope.twt,
                              data.seismic.length - 1, $scope.twt);
      $scope.vDHor.yInt(data.dt).reDraw(arr);
    }
  };

  function vDWigLineRedraw(){
    var xScale = $scope.vDPlot.xScale();
    var x = Math.floor(xScale.invert(d3.event.x));

    if(x < 0){ x = 0; } 
    else if(x > $scope.data.seismic.length - 1){ x = $scope.data.seismic.length - 1; }

    $scope.traceStr = x.toString();
    $scope.changeTraceStr();
    $scope.vDWigLine.reDraw($scope.trace,
                            ($scope.data.seismic[0].length - 1) * $scope.data.dt,
                            $scope.trace, 0);
  }

  function vDHorLineRedraw(){
    var yScale = $scope.vDPlot.yScale();
    var y = (yScale.invert(d3.event.y));

    if(y < 0){ y = 0; } 
    else if(y > ($scope.data.seismic[0].length - 1) * $scope.data.dt)
    { y = ($scope.data.seismic[0].length - 1) * $scope.data.dt; }

    $scope.twtStr = y.toString();
    $scope.changeTWTStr();
    $scope.wGHorLine.reDraw(0, $scope.twt, $scope.data.wavelet_gather.length - 1, $scope.twt);
    $scope.oGHorLine.reDraw(0, $scope.twt, $scope.data.offset_gather.length - 1, $scope.twt);
    $scope.vDHorLine.reDraw(0, $scope.twt, $scope.data.seismic.length - 1, $scope.twt);
  };

  $scope.plotOffset = function(data, height, max){
    // Offset Gather Plot
    var width = $('.og_plot').width();
    if(!$scope.oGPlot){
      $scope.oGPlot = g3.plot('.og_plot')
        .height(height)
        .width(width - 30)
        .xTitle("angle gather")
        .xTicks(6)
        .x2Ticks(6)
        .xTickFormat("")
        .x2TickFormat("")
        .yTickFormat("")
        .y2TickFormat("")
        .margin(20,10,5,30)
        .xDomain([0, data.offset_gather.length - 1])
        .yDomain([0, (data.offset_gather[0].length - 1)*data.dt])
        .draw();
    } else {
      $scope.oGPlot.reDraw(
        [0, data.offset_gather.length - 1], 
        [0, (data.offset_gather[0].length - 1)*data.dt]
      );
    }

    // Draw Offset Gather Image
    if(!$scope.og){
      $scope.og = g3.seismic($scope.oGPlot, [data.offset_gather])
        .max(max)
        .nDColorMap([$scope.colorScale])
        .gain($scope.gain)
        .draw();
    } else {
      $scope.og
        .gain($scope.gain)
        .nDColorMap([$scope.colorScale])
        .reDraw([data.offset_gather]);
    }
  };

  $scope.plotOffsetHorizon = function(data){
    // Draw Offset Horizon
    var xScale = $scope.oGPlot.xScale();
    var yScale = $scope.oGPlot.yScale();

    var arr = [];
    for(var i = 0; i < data.offset_gather.length; i++){
      arr.push($scope.twt);
    }

    if(!$scope.oGHor){
      $scope.oGHor = g3.horizon($scope.oGPlot, arr).draw();

        // Register drag trigger for wGWigLine
        var wigLineDrag = d3.behavior.drag()
          .on('drag', oGWigLineRedraw);

        // Register drag trigger for wGHorLine
        var horLineDrag = d3.behavior.drag()
          .on('drag', oGHorLineRedraw);

        // Draw invisible line
        $scope.oGWigLine = g3.handle.line(
          $scope.oGPlot, 
          $scope.offset, 
          (data.offset_gather[0].length - 1) * data.dt,
          $scope.offset,
          0)
        .class('ogwigline')
          .draw();
        $scope.oGWigLine.line().call(wigLineDrag);

        // Draw invisible horizon line
        $scope.oGHorLine = g3.handle.line(
          $scope.oGPlot, 
          0, 
          $scope.twt,
          data.offset_gather.length - 1,
          $scope.twt)
          .draw();

        $scope.oGHorLine.line().call(horLineDrag);

        // Register mouseup trigger for wgline
        $(".ogwigline").mouseup(function(e){
          e.preventDefault();
          $scope.update_data();
        });

    } else {
      $scope.oGHor.reDraw(arr);
      // Redraw the invisible line
      $scope.oGWigLine.reDraw($scope.offset,
                              (data.offset_gather[0].length - 1)*data.dt, $scope.offset, 0);
      // Redraw invisible horizon
      $scope.oGHorLine.reDraw(0, $scope.twt,
                              data.offset_gather.length - 1, $scope.twt);
    }
  };

  function oGWigLineRedraw(){
    var xScale = $scope.oGPlot.xScale();
    var yScale = $scope.oGPlot.yScale();
    var x = Math.floor(xScale.invert(d3.event.x));

    if(x < 0){ x = 0; } 
    else if(x > $scope.data.offset_gather.length - 1){
      x = $scope.data.offset_gather.length - 1;
    }

    $scope.offsetStr = x.toString();
    $scope.changeOffsetStr();
    $scope.oGWigLine.reDraw($scope.offset,
                            ($scope.data.offset_gather[0].length - 1) * $scope.data.dt,
                            $scope.offset,0);
  }

  function oGHorLineRedraw(){
    var xScale = $scope.oGPlot.xScale();
    var yScale = $scope.oGPlot.yScale();
    var y = yScale.invert(d3.event.y);

    if(y < 0){ y = 0; } 
    else if(y > ($scope.data.offset_gather[0].length - 1) * $scope.data.dt){ 
      y = ($scope.data.offset_gather[0].length - 1) * $scope.data.dt;
    }

    $scope.twtStr = y.toString();
    $scope.changeTWTStr();
    $scope.wGHorLine.reDraw(0, $scope.twt, $scope.data.wavelet_gather.length - 1, $scope.twt);
    $scope.oGHorLine.reDraw(0, $scope.twt, $scope.data.offset_gather.length - 1, $scope.twt);
    $scope.vDHorLine.reDraw(0, $scope.twt, $scope.data.seismic.length - 1, $scope.twt);
  };

  $scope.plotWavelet = function(data, height, max){
    // Wavelet Gather Plot
    var width = $('.wg_plot').width();
    if(!$scope.wGPlot){
      $scope.wGPlot = g3.plot('.wg_plot')
        .height(height)
        .width(width - 30)
        .xTitle("wavelet gather")
        .xTicks(6)
        .x2Ticks(6)
        .xTickFormat("")
        .x2TickFormat("")
        .yTickFormat("")
        .y2TickFormat("")
        .margin(20,10,5,20)
        .xDomain([0, data.wavelet_gather.length - 1])
        .yDomain([0, (data.wavelet_gather[0].length - 1) * data.dt])
        .draw();
    } else {
      $scope.wGPlot.reDraw(
        [0, data.wavelet_gather.length - 1], 
        [0, (data.wavelet_gather[0].length - 1) * data.dt]
      );
    }

    // Draw Wavelet Gather Image
    if(!$scope.wg){
      $scope.wg = g3.seismic($scope.wGPlot, [data.wavelet_gather])
        .max(max)
        .nDColorMap([$scope.colorScale])
        .gain($scope.gain)
        .draw();
    } else {
      $scope.wg
        .nDColorMap([$scope.colorScale])
        .gain($scope.gain)
        .reDraw([data.wavelet_gather]);
    }
  };

  $scope.plotWaveletHorizon = function(data){
    var arr = [];
    for(var i = 0; i < data.wavelet_gather.length; i++){
      arr.push($scope.twt);
    }

    if(!$scope.wGHor){
      // Draw horizon line
      $scope.wGHor = g3.horizon($scope.wGPlot, arr).draw();
      
      // Register drag trigger for wGWigLine
      var wigLineDrag = d3.behavior.drag()
        .on('drag', wGWigLineRedraw);

      // Register drag trigger for wGHorLine
      var horLineDrag = d3.behavior.drag()
        .on('drag', wGHorLineRedraw);

      // Draw invisible line
      $scope.wGWigLine = g3.handle.line(
        $scope.wGPlot, 
        $scope.frequency, 
        (data.wavelet_gather[0].length - 1)*data.dt,
        $scope.frequency,
        0)
        .class('wgwigline')
        .draw();
      $scope.wGWigLine.line().call(wigLineDrag);

      $scope.wGHorLine = g3.handle.line(
        $scope.wGPlot, 
        0, 
        $scope.twt,
        data.wavelet_gather.length - 1,
        $scope.twt)
        .draw();
      $scope.wGHorLine.line().call(horLineDrag);

      // Register mouseup trigger for wgline
      $(".wgwigline").mouseup(function(e){
        e.preventDefault();
        $scope.update_data();
      });

    } else {
      // Redraw the invisible line
      $scope.wGWigLine.reDraw($scope.frequency,
                              (data.wavelet_gather[0].length - 1)*data.dt, 
        $scope.frequency, 0);
      // Redraw invisible horizon
      $scope.wGHorLine.reDraw(0, $scope.twt, data.wavelet_gather.length - 1, $scope.twt);
      // Redraw horizon
      $scope.wGHor.reDraw(arr);
    }
  };

  function wGWigLineRedraw(){
    var xScale = $scope.wGPlot.xScale();
    var x = Math.floor(xScale.invert(d3.event.x));

    if(x < 0){ x = 0; } 
    else if(x > $scope.data.wavelet_gather.length - 1){
      x = $scope.data.wavelet_gather.length - 1;
    }

    $scope.frequencyStr = x.toString();
    $scope.changeFrequencyStr();
    $scope.wGWigLine.reDraw($scope.frequency,
                            ($scope.data.wavelet_gather[0].length - 1)*$scope.data.dt, 
        $scope.frequency, 0);
  }

  function wGHorLineRedraw(){
    var yScale = $scope.wGPlot.yScale();
    var y = (yScale.invert(d3.event.y));

    if(y < 0){ y = 0; } 
    else if(y > ($scope.data.wavelet_gather[0].length - 1)*$scope.data.dt){
      y = ($scope.data.wavelet_gather[0].length - 1)*$scope.data.dt;
    }

    $scope.twtStr = y.toString();
    $scope.changeTWTStr();
    $scope.wGHorLine.reDraw(0, $scope.twt, $scope.data.wavelet_gather.length - 1, $scope.twt);
    $scope.oGHorLine.reDraw(0, $scope.twt, $scope.data.offset_gather.length - 1, $scope.twt);
    $scope.vDHorLine.reDraw(0, $scope.twt, $scope.data.seismic.length - 1, $scope.twt);
  }

  $scope.plotAmplitudeTrace = function(data, height){
    // Amplitude Trace
    var width = $('.at_plot').width();

    if(!$scope.aTPlot){
      $scope.aTPlot = g3.plot('.at_plot')
        .height(height)
        .yTitle("amplitude")
        .width(width - 30)
        .yTicks(6)
        .y2Ticks(6)
        .xTickFormat("")
        .y2TickFormat("")
        .x2Title("trace")
        .margin(5,10,40,40)
        .xDomain([0, data.seismic.length - 1])
        .yDomain([1, -1])
        .draw();
    }

    $scope.aTArr = getCrossSection(data.seismic, $scope.twt, $scope.data.dt);

    if(!$scope.aTHor){
      $scope.aTHor = g3.horizon($scope.aTPlot, $scope.aTArr).draw();
    } else {
      $scope.aTHor.reDraw($scope.aTArr);
    }
  };

  $scope.plotAmplitudeOffset = function(data, height){
    // Amplitude Offset Plot
    var width = $('.ao_plot').width();
    if(!$scope.aOPlot){
      $scope.aOPlot = g3.plot('.ao_plot')
        .height(height)
        .width(width - 30)
        .x2Title("\u03B8" + "\u00B0")
        .yTicks(6)
        .y2Ticks(6)
        .xTicks(6)
        .x2Ticks(6)
        .xTickFormat("")
        .yTickFormat("")
        .y2TickFormat("")
        .x2TickFormat(function(d, i){
          return $scope.data.theta[d];
        })
        .margin(5,10,40,30)
        .xDomain([0, data.offset_gather.length - 1])
        .yDomain([1, -1])
        .draw();
    } 

    $scope.aOArr = getCrossSection($scope.data.offset_gather, $scope.twt, $scope.data.dt);

    if(!$scope.aOHor){
      $scope.aOHor = g3.horizon($scope.aOPlot, $scope.aOArr).draw();
    } else {
      $scope.aOHor.reDraw($scope.aOArr);
    }
  };

  $scope.plotAmplitudeFreq = function(data, height){

    // Amplitude Freq Plot
    var width = $('.af_plot').width();
    if(!$scope.aFPlot){
      $scope.aFPlot = g3.plot('.af_plot')
        .height(height)
        .width(width - 30)
        .x2Title("centre frequency Hz")
        .yTicks(6)
        .y2Ticks(6)
        .xTicks(6)
        .x2Ticks(6)
        .xTickFormat("")
        .yTickFormat("")
        .y2TickFormat("")
        .x2TickFormat(function(d, i){
          return Math.floor($scope.data.f[d]);
        })
        .margin(5,10,40,20)
        .xDomain([0, $scope.data.wavelet_gather.length - 1])
        .yDomain([1, -1])
        .draw();
    }

    $scope.aFArr = getCrossSection($scope.data.wavelet_gather, $scope.twt, $scope.data.dt);

    if(!$scope.aFHor){
      $scope.aFHor = g3.horizon($scope.aFPlot, $scope.aFArr).draw();
    } else {
      $scope.aFHor.reDraw($scope.aFArr);
    }
  };

  $scope.plotVDWiggle = function(data){
    // Draw VD Plot Wiggle
    var arr = [data.seismic[$scope.trace]];
    if(!$scope.vDLog){
      $scope.vDLog = g3.wiggle($scope.vDPlot, arr)
        .xTrans($scope.trace)
        .xMult(80 * $scope.gain)
        .yMult(data.dt)
        .duration(5)
        .draw();

    } else {
      $scope.vDLog
        .xTrans($scope.trace)
        .xMult(80 * $scope.gain)
        .yMult(data.dt)
        .reDraw(
          arr, 
          [0, data.seismic.length - 1], 
          [0, (data.seismic[0].length - 1)*data.dt]
        );
    }
  };

  $scope.plotOffsetWiggle = function(data){
    // Draw Offset Wiggle
    var arr = [data.offset_gather[$scope.offset]];
    if(!$scope.oGLog){
      $scope.oGLog = g3.wiggle($scope.oGPlot, arr)
        .xTrans($scope.offset)
        .xMult(5 * $scope.gain)
        .yMult(data.dt)
        .draw();
    } else {
      $scope.oGLog
        .xMult(5 * $scope.gain)
        .xTrans($scope.offset)
        .yMult(data.dt)
        .reDraw(
          arr, 
          [0, data.offset_gather.length - 1], 
          [0, (data.offset_gather[0].length - 1)*data.dt]
        );
    }
  };

  $scope.plotWaveletWiggle = function(data){
    // Draw Offset Wiggle
    $scope.frequencyNum = $scope.data.f[$scope.frequency];
    var arr = [data.wavelet_gather[$scope.frequency]];
    if(!$scope.wGLog){
      $scope.wGLog = g3.wiggle($scope.wGPlot, arr)
        .xTrans($scope.frequencyNum)
        .xMult(22.7 * $scope.gain)
        .yMult(data.dt)
        .draw();
    } else {
      $scope.wGLog
        .xTrans($scope.frequency)
        .xMult(22.7 * $scope.gain)
        .yMult(data.dt)
        .reDraw(
          arr, 
          [0, data.wavelet_gather.length - 1], 
          [0, (data.wavelet_gather[0].length - 1)*data.dt]
        );
    }
  };

  $scope.plot = function(data){
    $scope.data = data;
    var height = 450;
    var max = getMax(data.max, data.min);
    max = Number(max.toFixed(2));

    if(!$scope.colorDomain){
      $scope.colorDomain = [-max, 0, max];
    }

    
    $scope.colorScale = d3.scale.linear().domain($scope.colorDomain).range($scope.colorRange);
    $scope.plotSeismic(data, height, max);
    $scope.plotOffset(data, height, max);
    $scope.plotWavelet(data, height, max);
    height = 150;
    $scope.plotAmplitudeTrace(data, height);
    $scope.plotAmplitudeOffset(data, height);
    $scope.plotAmplitudeFreq(data, height);
    $scope.plotVDWiggle(data);
    $scope.plotOffsetWiggle(data);
    $scope.plotWaveletWiggle(data, height);
    $scope.plotVDHorizon(data);
    $scope.plotOffsetHorizon(data);
    $scope.plotWaveletHorizon(data);
  };

  $scope.makeEarthModelStruct = function(){
    var image = $scope.curImage;
    var mapping = {};
    for(var i=0; i < image.rocks.length; i++){
      mapping[image.colours[i]] = image.rocks[i];
    }
    
    var data = {
      image: $scope.curImage.image,
      mapping: mapping,
      image_key: $scope.curImage.key,
      zrange: $scope.zRange,
      domain: $scope.zAxisDomain,
      theta: $scope.theta,
      name: $scope.earthModelName
    };

    return(data);
  };
  
  $scope.saveModel = function(){
    var data = $scope.makeEarthModelStruct();

    if($scope.earthModelName === '' || $scope.earthModelName === undefined){
      var myAlert = $alert({
        title: 'Alert:',
        content: 'Model name is required.',
        placement: 'alert-success',
        type: 'danger',
        duration: 5,
        show: true
      });
      return;
    }

    $http.post('/earth_model', data)
      .then(function(response){
        $scope.curImage.earth_models.push(response.data);
        $scope.zAxisDomain = 'depth';
        $scope.zRange = 1000;

        var myAlert = $alert({
          title: 'Success:',
          content: 'You have saved your model \'' + $scope.earthModelName + '\'.',
          placement: 'alert-success',
          type: 'success',
          duration: 5,
          show: true
        });
        $scope.earthModelName = "";
    });
  };

  $scope.setDefaults();
  $scope.fetchImageModels();
  $scope.fetchRocks();
  $( document ).ready(function(){
    $scope.setColorPickers();
  });

  $scope.exportCSV = function(){
    var csv = [];
    $.each($scope.data.metadata.moduli, function(key, value) {
      csv.push('"' + key + '"');
      $.each(value, function(k, v) {
        if(k === 'imp'){
          v = (v / 1000000).toFixed(2);
        } else if(k === 'pr'){
          v = v.toFixed(2);
        } else {
          v = (v / 1000000000).toFixed(2);
        }
        csv.push(',"' + v + '"');
      });
      csv.push('\r\n');
    });
    csv = csv.join("");
    var hiddenElement = document.createElement('a');
    hiddenElement.href = 'data:attachment/csv,' + encodeURI(csv);
    hiddenElement.target = '_blank';
    hiddenElement.download = 'export.csv';
    hiddenElement.click();
  };
});

// <-- HELPER FUNCTIONS --> //
// Take two numbers and return the abs max of the two
function getMax(a, b){
  if(Math.abs(a) > Math.abs(b)){
    return Math.abs(a);
  } else {
    return Math.abs(b);
  }
}



// Get a row from a columnar matrix
function getCrossSection(matrix, value, sampleRate){
    var arr = [];
    var rowIndex = Math.floor(value / sampleRate);
  for(var i = 0; i < matrix.length; i++){
    arr.push(matrix[i][rowIndex]);
  }
  return arr;

}

app.controller('buildCtrl', function ($scope, $rootScope) { 
	$scope.type = 'none';

	$scope.changeType = function(type){
		$scope.type = type;
	};

});


app.service('modelBuilder', function () { 
	var lineFunction = d3.svg.line()                         
		.x(function(d) { return d.x; })
  	.y(function(d) { return d.y; });

	this.drawPath = function(elem, path, index, color){
		elem.append('path')
			.attr('id', 'path' + index)
			.attr('d', lineFunction(path))
			.style('stroke-width', 1)
			//.style('stroke', 'black')
			.attr('fill', color);
	};

	this.drawCircles = function(elem, path, index){
		for(var i = 0; i < path.length; i++){
			if(path[i].hidden === false){
				elem.append('circle')
					.style('fill', 'black')
					.attr('class', i)
					.attr('id', 'circle' + index)
					.attr('cx', path[i].x)
					.attr('cy', path[i].y)
					.attr('r', 7)
					.style('cursor', 'move');
			}
		}
		// elem.selectAll("circle" + index)
		// 	.data(path)
		// 	.enter().append("circle")
		// 	.style('fill', 'black')
		// 	.attr('class', function(d, j){ return j;})
		// 	.attr('id', function(d, j){ return 'circle' + index;})
		// 	.attr('cx', function(d){ return d.x; })
		// 	.attr('cy', function(d){ return d.y; })
		// 	.attr('r', 7)
		// 	.style('cursor', 'move');
	};

});
app.controller('fMCtrl', function ($scope, modelBuilder) {
	
	// Define default variables
	var lineFunction = d3.svg.line()                         
		.x(function(d) { return d.x; })
  	.y(function(d) { return d.y; });

  var margin = {top: 50, right: 40, bottom: 30, left: 40};
  $scope.wWidth = $('.fWM').width() - margin.left - margin.right;
    //yWidth = $('.fWM').width() * 0.40 - margin.left - margin.right,
  $scope.yHeight = 400 - margin.top - margin.bottom;

	// Create scales
	var wXScale = d3.scale.linear().domain([0, $scope.wWidth]).range([0, $scope.wWidth]);
	//var yXScale = d3.scale.linear().domain([50, yWidth]).range([0, yWidth ]);
 	var yScale = d3.scale.linear().domain([0, $scope.yHeight]).range([0, $scope.yHeight]);

	// Create axis
	var wXAxis = d3.svg.axis().scale(wXScale).orient('top').ticks(3);
	//var yXAxis = d3.svg.axis().scale(yXScale).orient('top').ticks(4);
	var yAxis = d3.svg.axis().scale(yScale).orient('left').ticks(3);

	$scope.leftLinePos = $scope.wWidth * 0.15;
	$scope.rightLinePos = $scope.wWidth * 0.85;

  $scope.wPaths = [];
  //$scope.yPaths = [];
 	$scope.aBot = 75;
 	$scope.bTop = 250;
 	$scope.yDifAB = $scope.bTop - $scope.aBot;
 	$scope.count = 1;

	var circleDrag = d3.behavior.drag()
	  .origin(Object)
	  .on("drag", moveCircle);

	$scope.linesOn = true;

	$scope.addWedgePaths = function(){
		$scope.wedgePaths = [];
		// Draw W Paths
		for(var i = 0; i < $scope.wPaths.length; i++){
	 		var color = "";
			if(i % 2 == 0){
				color = '#996633'; 
			} else {
				color = '#ecd9c6';
			}
			var path = $scope.wModel.append('path')
				.attr('id', 'path' + i)
				.attr('d', lineFunction($scope.wPaths[i]))
				.style('stroke-width', 1)
				.attr('fill', color);
			$scope.wedgePaths.push(path);
		}
	};

	$scope.drawPaths = function(){

 		// Transition the paths
		for(var i = 0; i < $scope.wedgePaths.length; i++){
			//console.log($scope.wedgePaths[i]);
			$scope.wedgePaths[i]
				.transition()
				.duration(5)
				.attr('d', lineFunction($scope.wPaths[i]));
		}

		// Move the botLine
		$scope.botLine
			.attr('y1', $scope.bTop)
			.attr('y2', $scope.bTop);

		// Move the topLine
		$scope.topLine
			.attr('y1', $scope.aBot)
			.attr('y2', $scope.aBot);

		// Move the rightLine
		$scope.rightLine
			.attr('x1', $scope.rightLinePos)
			.attr('x2', $scope.rightLinePos);

		// Move the leftLine
		$scope.leftLine
			.attr('x1', $scope.leftLinePos)
			.attr('x2', $scope.leftLinePos);

		// Move the leftLineCir
		$scope.leftLineCir
			.attr('cx', $scope.leftLinePos)
			.attr('cy', $scope.aBot);

		// Move the rightLineCir
		$scope.rightLineCir
			.attr('cx', $scope.rightLinePos)
			.attr('cy', $scope.bTop);
	};

	$scope.addMeasureLines = function(){
		// Create left measure line
		$scope.leftLine = $scope.wModel.append('line')
			.attr('class', 'guideLine')
			.attr('x1', $scope.leftLinePos)
			.attr('y1', 0)
			.attr('x2', $scope.leftLinePos)
			.attr('y2', $scope.yHeight)
			.style('stroke', 'black')
			.style('stroke-dasharray', '4,4');

		// Create right measure line
		$scope.rightLine = $scope.wModel.append('line')
			.attr('class', 'guideLine')
			.attr('x1', $scope.rightLinePos)
			.attr('y1', 0)
			.attr('x2', $scope.rightLinePos)
			.attr('y2', $scope.yHeight)
			.style('stroke', 'black')
			.style('stroke-dasharray', '4,4');

		// Create top measure line
		$scope.topLine = $scope.wModel.append('line')
			.attr('class', 'guideLine')
			.attr('x1', 0)
			.attr('y1', $scope.aBot)
			.attr('x2', $scope.wWidth)
			.attr('y2', $scope.aBot)
			.style('stroke', 'black')
			.style('stroke-dasharray', '4,4');

		// Create bottom measure line
		$scope.botLine = $scope.wModel.append('line')
			.attr('class', 'guideLine')
			.attr('x1', 0)
			.attr('y1', $scope.bTop)
			.attr('x2', $scope.wWidth)
			.attr('y2', $scope.bTop)
			.style('stroke', 'black')
			.style('stroke-dasharray', '4,4');
	};

	$scope.addMeasureHandles = function(){
		// Create leftLine measure handle
		$scope.leftLineCir = $scope.wModel.append('circle')
			.attr('class', 'leftCircle')
			.attr('cx', $scope.leftLinePos)
			.attr('cy', $scope.aBot)
			.attr('r', 7)
			.style('cursor', 'move')
			.call(circleDrag);

		// Create right line measure handle
		$scope.rightLineCir = $scope.wModel.append('circle')
			.attr('class', 'rightCircle')
			.attr('cx', $scope.rightLinePos)
			.attr('cy', $scope.bTop)
			.attr('r', 7)
			.style('cursor', 'move')
			.call(circleDrag);
	};

	$scope.createWedgePaths = function(){
 		$scope.wPaths = [];
 		$scope.wPaths.push(
			[
		  	{"x":$scope.leftLinePos,"y":$scope.aBot},
		  	{"x":$scope.rightLinePos,"y":$scope.aBot},
		  	{"x":$scope.wWidth,"y":$scope.aBot, "hidden": true},
		  	{"x":$scope.wWidth,"y":$scope.aBot + $scope.yDifAB / $scope.count},
		  	{"x":$scope.rightLinePos,"y":$scope.aBot + $scope.yDifAB / $scope.count},
			]
		);
		for(var i = 0; i < $scope.count - 1; i++){
		var path = [];
		var ll = $scope.wPaths[$scope.wPaths.length - 1];
		for(var j = 0; j < ll.length; j++){
			if(j == 0){
				path.push({"x":ll[j].x, "y":ll[j].y});
			} else {
				path.push({"x":ll[j].x, "y":ll[j].y + $scope.yDifAB / $scope.count});
			}
		}
			$scope.wPaths.push(path);
		}
 	};

	$scope.toggleLines = function(){
		if($scope.linesOn == true){
			d3.selectAll('.guideLine').style('display', 'block');
			d3.selectAll('circle').style('display', 'block');
		} else {
			d3.selectAll('.guideLine').style('display', 'none');
			d3.selectAll('circle').style('display', 'none');
		}
	};

	// Create the base wedge svg
	$scope.container = d3.select(".fWM").append("svg")
		.attr('class', 'mcontainer')
	  .attr('width', $('.fWM').width())
	  .attr('height', $scope.yHeight + margin.top + margin.bottom)
	  .style('border', '1px solid grey');

	// add xWAxis
  $scope.container.append("g")
  	.attr('class', 'x axis')
	  .attr('transform', 'translate(' + margin.left + ',' + margin.top + ')')
    .call(wXAxis)
      .append("text")
      .attr("y", -35)
      .attr('x', $scope.wWidth / 2)
      .attr("dy", ".71em")
      .style("text-anchor", "middle")
      .text("X");

  // add yAxis 
  $scope.container.append('g')
  	.attr('class', 'y axis')
  	.attr('transform', 'translate(' + margin.left + ',' + margin.top + ')')
  	.call(yAxis);

 	// add xYAxis
  // $scope.container.append('g')
  // 	.attr('class', 'x axis')
	 //  .attr('transform', 'translate(' + (margin.left + $scope.wWidth + 10) + ',' + margin.top + ')')
  //   .call(yXAxis)
  //     .append("text")
  //     .attr("y", -35)
  //     .attr('x', yWidth / 2)
  //     .attr("dy", ".71em")
  //     .style("text-anchor", "middle")
  //     .text("Y");

  // Create Wedge Model SVG
	$scope.mModel = $scope.container.append("g")
	  .attr('width', $scope.wWidth)
	  .attr('height', $scope.yHeight)
	  .attr('transform', 'translate(' + margin.left + ',' + margin.top + ')');

	$scope.wModel = $scope.mModel.append("svg")
		.attr('class', 'fWModel')
	  .attr('width', $scope.wWidth)
	  .attr('height', $scope.yHeight)
	  .attr('transform', 'translate(' + margin.left + ',' + margin.top + ')');

	// $scope.wModel.append('line')
	// 	.attr('class', 'guideLine')
	// 	.attr('x1', $scope.wWidth)
	// 	.attr('y1', 0)
	// 	.attr('x2', $scope.wWidth)
	// 	.attr('y2', $scope.yHeight)
	// 	.style('stroke', 'black')
	// 	.style('stroke-width', 20)
	// 	.style("stroke-dasharray", "4,2");

	// Create Wedge Model Background fill
	$scope.wModel.append('rect')
		.attr('width', $scope.wWidth)
		.attr('height', $scope.yHeight)
		.style('fill', '#00cc99');

	$scope.createWedgePaths();
	console.log($scope.wPaths);
	$scope.addWedgePaths();
	$scope.addMeasureLines();
	$scope.addMeasureHandles();
	$scope.drawPaths();

	// Draw paths and collect them in an array 		// Draw Y Paths
	 // 	for(var i = 0; i < $scope.yPaths.length; i++){
	 // 		var color = "";
		// 	if(i % 2 == 0){
		// 		color = '#996633'; 
		// 	} else {
		// 		color = '#ecd9c6';
		// 	}
		// 	$scope.yModel.append('path')
		// 		.attr('d', lineFunction($scope.yPaths[i]))
		// 		.style('stroke-width', 1)
		// 		.attr('fill', color);
		// }

	// Create Y Model SVG
	// $scope.yModel = $scope.container.append("g")
	//   .attr('width', yWidth)
	//   .attr('$scope.yHeight', $scope.yHeight)
	//   .attr('transform', 'translate(' + ($scope.wWidth + margin.left + 10) + ',' + margin.top + ')')
	//   .style('border', '1px solid grey');

	// Create Y Model Background fill
	// $scope.yModel.append('rect')
	// 	.attr('width', yWidth)
	// 	.attr('$scope.yHeight', $scope.yHeight)
	// 	.style('fill', '#00cc99');

	$scope.changeValue = function(){
 		$scope.yDifAB = $scope.bTop - $scope.aBot;
 		// if($scope.modelType === 'sym'){
 		// 	$scope.createSymPaths();
 		// } else if($scope.modelType === 'bot'){
 		// 	$scope.createBotPaths();
 		// } else {
 		// 	$scope.createTopPaths();
 		// }
 		$scope.createWedgePaths();
 		$scope.drawPaths();
 	};

 	$scope.changeType = function(type){
 		$scope.modelType = type;
 		if(type === 'sym'){
 			$scope.createSymPaths();
 		} else if(type === 'bot'){
 			$scope.createBotPaths();
 		} else {
 			$scope.createTopPaths();
 		}
 	};

 	$scope.createSymPaths = function(){
 		// Add default path
 		$scope.yPaths = [];
		$scope.yPaths.push(
			[
				{"x":0, "y": $scope.aBot},
				{"x":yWidth, "y":$scope.aBot},
				{"x":yWidth, "y":$scope.aBot + $scope.yDifAB / $scope.count},
				{"x":0, "y": $scope.aBot + ($scope.yDifAB / 2) / $scope.count}
			]
		);

	 	for(var i = 0; i < $scope.count - 1; i++){
	 		var ll = $scope.yPaths[$scope.yPaths.length - 1];
	 		if(i % 2 == 0){
				var path = [
				 	{"x":0, "y": ll[3].y},
					{"x":yWidth, "y":ll[2].y},
					{"x":0, "y":ll[0].y + $scope.yDifAB / $scope.count},
				];
	 		} else {
				var path = [
				 	{"x":0, "y": ll[2].y},
				 	{"x":yWidth, "y":ll[1].y},
					{"x":yWidth, "y":ll[1].y + $scope.yDifAB / $scope.count},
					{'x':0, 'y':ll[2].y + ($scope.yDifAB / 2) / $scope.count}
				];
			}
	 		$scope.yPaths.push(path);
	 	}
	 	$scope.drawPaths();
 	};

 	$scope.createTopPaths = function(){
 		// Add default bot path
 		$scope.yPaths = [];
		$scope.yPaths.push(
			[
				{"x":yWidth, "y": $scope.aBot + $scope.yDifAB / $scope.count},
				{"x":yWidth, "y":$scope.aBot},
				{"x":0, "y":$scope.aBot + $scope.yDifAB / $scope.count},
			]
		);

	 	for(var i = 0; i < $scope.count; i++){
	 		var ll = $scope.yPaths[$scope.yPaths.length - 1];
	 		if(i % 2 == 0){
				var path = [
				 	{"x":0, "y": ll[0].y},
					{"x":yWidth, "y":ll[2].y},
					{"x":0, "y":ll[0].y + $scope.yDifAB / $scope.count},
				];
	 		} else {
				var path = [
				 	{"x":0, "y": ll[2].y},
				 	{"x":yWidth, "y":ll[1].y},
					{"x":yWidth, "y":ll[1].y + $scope.yDifAB / $scope.count},
				];
			}
	 		$scope.yPaths.push(path);
	 	}
	 	$scope.drawPaths();
 	};

 	$scope.createBotPaths = function(){
 		// Add default bot path
 		$scope.yPaths = [];
		$scope.yPaths.push(
			[
				{"x":0, "y": $scope.aBot},
				{"x":yWidth, "y":$scope.aBot},
				{"x":yWidth, "y":$scope.aBot + $scope.yDifAB / $scope.count},
			]
		);

	 	for(var i = 0; i < $scope.count; i++){
	 		var ll = $scope.yPaths[$scope.yPaths.length - 1];
	 		if(i % 2 == 0){
				var path = [
				 	{"x":0, "y": ll[0].y},
					{"x":yWidth, "y":ll[2].y},
					{"x":0, "y":ll[0].y + $scope.yDifAB / $scope.count},
				];
	 		} else {
				var path = [
				 	{"x":0, "y": ll[2].y},
				 	{"x":yWidth, "y":ll[1].y},
					{"x":yWidth, "y":ll[1].y + $scope.yDifAB / $scope.count},
				];
			}
	 		$scope.yPaths.push(path);
	 	}
	 	$scope.drawPaths();
 	};

 	// NEED THIS PLUGGED IN MY BEN!
 	$scope.saveModel = function(){

		var model = {};
		model.paths = $scope.yPaths;

		// Clear guide lines from image
		d3.selectAll('.guideLine').style('display', 'none');

	  var svg = d3.select(".fWModel").node(),
	      img = new Image(),
	      serializer = new XMLSerializer(),
	      svgStr = serializer.serializeToString(svg);

	  img.src = 'data:image/svg+xml;base64,'+window.btoa(svgStr);

    // You could also use the actual string without base64 encoding it:
    //img.src = "data:image/svg+xml;utf8," + svgStr;

    // UNCOMMENT THIS IF YOU WANNA TEST AND SEE WHAT THE IMAGE LOOKS LIKE WHEN SAVED TO CANVAS
    // var canvas = document.createElement("canvas");
    // document.body.appendChild(canvas);

    // canvas.width = $scope.wWidth;
    // canvas.height = $scope.yHeight;
    // canvas.getContext("2d").drawImage(img,0,0);


	};

	function moveCircle(){
		var m = d3.mouse(this);
		var x, y;

		// Check to see if we are in bounds for x
		if(m[0] > $scope.wWidth){
			x = $scope.wWidth;
		} else if(m[0] < 0){
			x = 0;
		} else {
			x = m[0];
		}

		// Check to see if we are in bounds for y
		if(m[1] > $scope.yHeight){
			y = $scope.yHeight;
		} else if(m[1] < 0){
			y = 0;
		} else {
			y = m[1];
		}

		var obj = d3.select(this);
		obj.attr('cx', x)
			.attr('cy', y);

		if(obj.attr('class') === 'leftCircle'){
			$scope.$apply(function(){
				$scope.aBot = y;
				if(x < $scope.rightLinePos){
					$scope.leftLinePos = x;
				} else {
					$scope.leftLinePos = $scope.rightLinePos;
				}
			});
		} else {
			$scope.$apply(function(){
				$scope.bTop = y;

				if(x > $scope.leftLinePos){
					$scope.rightLinePos = x;
				} else {
					$scope.rightLinePos = $scope.leftLinePos;
				}
			});
		}
		$scope.changeValue();
	};
});
app.controller('modelBuilderCtrl', function ($scope, $http, $alert, $timeout) {
	var width = $('.modelb').width();
	var height = 400;
	$scope.pathColors = ['#0ef0ef'];
	var topHeight = 50;
	var line, x, y;
	$scope.editLines = true;

	$scope.paths = [
		[{"x":0, "y":height - topHeight},
	    {"x":width * 0.25,"y":height - topHeight},
	    {"x":width * 0.50,"y":height - topHeight},
	    {"x":width * 0.75, "y":height - topHeight},
	    {"x":width,"y":height - topHeight},
	  ]
	];

	var defaultPath = [
			{"x":0, "y":height},
	    {"x":width * 0.25,"y":height},
	    {"x":width * 0.50,"y":height},
	    {"x":width * 0.75, "y":height},
	    {"x":width,"y":height},
	  ];

	$scope.editToggle = function(){
		if($scope.editLines === false){
			d3.selectAll('circle').style('display', 'none');
			d3.selectAll('path').style('stroke', 'none');
		} else {
			d3.selectAll('circle').style('display', 'block');
			d3.selectAll('path').style('stroke', 'black');
		}
	};

	var vis = d3.select(".modelb").append("svg")
	  .attr("width", width)
	  .attr("height", height)
	  .style('border', '1px solid grey');

	$scope.addTop = function(){

		if($scope.editLines === false){
			$scope.editLines = true;
		}

		if($scope.paths.length > 0){
			var ll = $scope.paths[$scope.paths.length - 1];
		} else {
			var ll = defaultPath;
		}
		var path = [];
		for(var i = 0; i < ll.length; i++){
			path.push({"x":ll[i].x, "y":ll[i].y - topHeight});
		}
		$scope.paths.push(path);
		$scope.pathColors.push('#'+Math.floor(Math.random()*16777215).toString(16));
		drawTops();
	};

	// Area drawing function
	var area = d3.svg.area()
	  .x(function(d) { return d.x; })
	  .y0(height)
	  .y1(function(d) { return d.y; })
	  .interpolate('cardinal');


	// Drag functions
	var circleDrag = d3.behavior.drag()
	  .origin(Object)
	  .on("drag", moveCircle);

	var nsDrag = d3.behavior.drag()
		.on('drag', nsResize);

	drawTops();

	function drawTops(){
		$scope.tops = [];
		d3.selectAll('g').remove();
		for(var i = $scope.paths.length - 1; i >= 0; i--){
			console.log(i);
			var top = vis.append('g')
			.on('click', function(d,i){ selectLayer(this);});


			top.color = $scope.pathColors[i];
			top.append('path')
				.attr('id', "top" + i)
				.attr('d', area($scope.paths[i]))
				.style('stroke-width', 1)
				.attr('fill', $scope.pathColors[i])
				.style('stroke', function(d, j){
					if(i === $scope.paths.length - 1){
						return 'black';
					} else {
						return 'none';
					}
				})
				.call(nsDrag);;

			top.selectAll("circle" + i)
				.data($scope.paths[i])
				.enter().append("circle")
				.style('fill', 'black')
				.attr('class', function(d, j){ return j;})
				.attr('id', function(d, j){ return 'circle' + i;})
				.attr('cx', function(d){ return d.x; })
				.attr('cy', function(d){ return d.y; })
				.attr('r', 7)
				.style('cursor', 'move')
				.style('display', function(d, j){
					if(i === $scope.paths.length - 1){
						return 'block';
					} else {
						return 'none';
					}
				})
				.call(circleDrag);

			$scope.tops.push(top);
		}
	};

	function selectLayer(elem){
		elem = d3.select(elem);
		d3.selectAll('circle').style('display', 'none');
		d3.selectAll('path').style('stroke', 'none');
		d3.selectAll('#circle' + elem.attr('class')).style('display', 'block');
		d3.selectAll('#top' + elem.attr('class')).style('stroke', 'black');

		elem.attr('cursor', 'ns-resize')
	};

	$scope.saveModel = function(){
		//Insert json call here
		var model = {};
		model.paths = $scope.paths;
		model.pathColors = $scope.pathColors;
	  var svg = d3.select(".modelb svg").node(),
	      img = new Image(),
	      serializer = new XMLSerializer(),
	      svgStr = serializer.serializeToString(svg);

	    img.src = 'data:image/svg+xml;base64,'+window.btoa(svgStr);

	    // You could also use the actual string without base64 encoding it:
	    //img.src = "data:image/svg+xml;utf8," + svgStr;

	    var canvas = document.createElement("canvas");
	    document.body.appendChild(canvas);

	    canvas.width = 500;
	    canvas.height = 400;
	    canvas.getContext("2d").drawImage(img,0,0);
	};

	$scope.getColor = function(top){
		return d3.select(top[0][0].childNodes[0]).style('fill');
	};

	$scope.deleteTop = function(top){
		var index = d3.select(top[0][0]).attr('class');

		// Remove top
		$scope.tops.splice(index, 1);

		// Remove point set
		$scope.paths.splice(index, 1);

		// Remove color 
		$scope.pathColors.splice(index, 1);

		d3.selectAll('g').remove();
		drawTops();
	};

	function nsResize(){
		var m = d3.mouse(this);
		var parent = d3.select(this.parentNode);
		var index = parent.attr('class');
		var arr = [];

		// Get average y value
		for(var i = 0; i < $scope.paths[index].length; i++){
			arr.push($scope.paths[index][i].y);
		}
		var mean = d3.mean(arr);
		var change = mean - m[1];
		console.log(index);
		for(var i = 0; i < $scope.paths[index].length; i++){
			$scope.paths[index][i].y -= change;
		}
		var path = d3.select('#top' + index);
		path.transition().duration(5).attr('d', area($scope.paths[index])).ease('linear');
		
		var circles = d3.selectAll('#circle' + index);
		circles.data($scope.paths[index])
			.transition()
			.duration(5)
			.attr('cx', function(d){ return d.x; })
			.attr('cy', function(d){ return d.y; });
	};

	function moveCircle(){
		var m = d3.mouse(this);
		var x, y;

		// Check to see if we are in bounds for x
		if(m[0] > width){
			x = width;
		} else if(m[0] < 0){
			x = 0;
		} else {
			x = m[0];
		}

		// Check to see if we are in bounds for y
		if(m[1] > height){
			y = height;
		} else if(m[1] < 0){
			y = 0;
		} else {
			y = m[1];
		}

		var obj = d3.select(this);
			obj.attr('cx', x)
			.attr('cy', y);

		var parent = d3.select(this.parentNode);
		var i = parent.attr('class'), j = obj.attr('class');

		$scope.paths[i][j].x = x;
		$scope.paths[i][j].y = y;
		
		// Get child path (possibly find a better way to do this)
		var path = d3.select(parent[0][0].childNodes[0]);
		path.transition().duration(5).attr('d', area($scope.paths[i])).ease('linear');
	};

});
app.controller('wMYCtrl', function ($scope, modelBuilder) {

	var width = $('.wMY').width();
	var height = 400;

	// Create the base svg
	$scope.yModel = d3.select(".wMY").append("svg")
	  .attr('width', width)
	  .attr('height', height)
	  .style('border', '1px solid grey');

	// Add a background color
	$scope.yModel.append('rect')
		.attr('width', width)
		.attr('height', height)
		.style('fill', '#00cc99');

	var lineFunction = d3.svg.line()                         
		.x(function(d) { return d.x; })
  	.y(function(d) { return d.y; });

 	$scope.paths = [];
 	$scope.aBot = 100;
 	$scope.bTop = 300;
 	$scope.difAB = $scope.bTop - $scope.aBot;
 	$scope.count = 5;

 	$scope.changeValue = function(){
 		$scope.difAB = $scope.bTop - $scope.aBot;
 		if($scope.modelType === 'sym'){
 			$scope.createSymPaths();
 		} else if($scope.modelType === 'bot'){
 			$scope.createBotPaths();
 		} else {
 			$scope.createTopPaths();
 		}
 	};

 	$scope.changeType = function(type){
 		$scope.modelType = type;
 		if(type === 'sym'){
 			$scope.createSymPaths();
 		} else if(type === 'bot'){
 			$scope.createBotPaths();
 		} else {
 			$scope.createTopPaths();
 		}
 	};

 	$scope.createSymPaths = function(){
 		// Add default path
 		$scope.paths = [];
		$scope.paths.push(
			[
				{"x":0, "y": (2*($scope.aBot) + $scope.difAB / $scope.count) / 2},
				{"x":width, "y":$scope.aBot},
				{"x":width, "y":$scope.aBot + $scope.difAB / $scope.count},
			]
		);

	 	for(var i = 0; i < $scope.count - 1; i++){
	 		var ll = $scope.paths[$scope.paths.length - 1];
	 		if(i % 2 == 0){
				var path = [
				 	{"x":0, "y": ll[0].y},
					{"x":width, "y":ll[2].y},
					{"x":0, "y":ll[0].y + $scope.difAB / $scope.count},
				];
	 		} else {
				var path = [
				 	{"x":0, "y": ll[2].y},
				 	{"x":width, "y":ll[1].y},
					{"x":width, "y":ll[1].y + $scope.difAB / $scope.count},
				];
			}
	 		$scope.paths.push(path);
	 	}
	 	$scope.drawPaths();
 	};

 	$scope.createTopPaths = function(){
 		// Add default bot path
 		$scope.paths = [];
		$scope.paths.push(
			[
				{"x":width, "y": $scope.aBot + $scope.difAB / $scope.count},
				{"x":width, "y":$scope.aBot},
				{"x":0, "y":$scope.aBot + $scope.difAB / $scope.count},
			]
		);

	 	for(var i = 0; i < $scope.count; i++){
	 		var ll = $scope.paths[$scope.paths.length - 1];
	 		if(i % 2 == 0){
				var path = [
				 	{"x":0, "y": ll[0].y},
					{"x":width, "y":ll[2].y},
					{"x":0, "y":ll[0].y + $scope.difAB / $scope.count},
				];
	 		} else {
				var path = [
				 	{"x":0, "y": ll[2].y},
				 	{"x":width, "y":ll[1].y},
					{"x":width, "y":ll[1].y + $scope.difAB / $scope.count},
				];
			}
	 		$scope.paths.push(path);
	 	}
	 	$scope.drawPaths();
 	};

 	$scope.createBotPaths = function(){
 		// Add default bot path
 		$scope.paths = [];
		$scope.paths.push(
			[
				{"x":0, "y": $scope.aBot},
				{"x":width, "y":$scope.aBot},
				{"x":width, "y":$scope.aBot + $scope.difAB / $scope.count},
			]
		);

	 	for(var i = 0; i < $scope.count; i++){
	 		var ll = $scope.paths[$scope.paths.length - 1];
	 		if(i % 2 == 0){
				var path = [
				 	{"x":0, "y": ll[0].y},
					{"x":width, "y":ll[2].y},
					{"x":0, "y":ll[0].y + $scope.difAB / $scope.count},
				];
	 		} else {
				var path = [
				 	{"x":0, "y": ll[2].y},
				 	{"x":width, "y":ll[1].y},
					{"x":width, "y":ll[1].y + $scope.difAB / $scope.count},
				];
			}
	 		$scope.paths.push(path);
	 	}
	 	$scope.drawPaths();
 	};

 	$scope.drawPaths = function(){
 		d3.selectAll('path').remove();
	 	for(var i = 0; i < $scope.paths.length; i++){
	 		var color = "";
			if(i % 2 == 0){
				color = '#996633'; 
			} else {
				color = '#ecd9c6';
			}
			$scope.yModel.append('path')
				.attr('d', lineFunction($scope.paths[i]))
				.style('stroke-width', 1)
				.attr('fill', color);
		}
	};
});
app.controller('wedgeModelCtrl', function ($scope, $rootScope, modelBuilder) {

	var width = $('.wModel').width();
	var height = 600;
	var topHeight = 50;

	var lineFunction = d3.svg.line()                         
		.x(function(d) { return d.x; })
  	.y(function(d) { return d.y; });

	$scope.vis = d3.select(".wModel").append("svg")
	  .attr("width", width)
	  .attr("height", height)
	  .style('border', '1px solid grey');

	// Drag functions
	var circleDrag = d3.behavior.drag()
	  .origin(Object)
	  .on("drag", moveCircle);

	$scope.paths = [];
	var a = [
		{"x":0, "y":0, "hidden": true},
    {"x":width,"y":0, "hidden": true},
    {"x":width,"y":height - height * 0.75, "hidden": true},
    {"x":0, "y":height - height * 0.75, "hidden": true}
	];

	var b = [
		{"x":0, "y":height - height * 0.75, "hidden": true},
    {"x":width * 0.15,"y":height - height * 0.75, "hidden": false},
    {"x":width * 0.85,"y":height - height * 0.25, "hidden": false},
    {"x":width, "y":height - height * 0.25, "hidden": true},
    {"x":width, "y":height, "hidden": true},
    {"x":0, "y":height, "hidden": true},
	];

	var c = [
    {"x":width * 0.15,"y":height - height * 0.75, "hidden": true},
    {"x":width,"y":height - height * 0.75, "hidden": true},
    {"x":width,"y":height - height * 0.25, "hidden": true},
    {"x":width * 0.85,"y":height - height * 0.25, "hidden": true},
	];

	// var d = [
 //    {"x":width * 0.15,"y":height - height * 0.75, "hidden": true},
 //    {"x":width,"y":height - height * 0.75, "hidden": true},
 //    {"x":width,"y":height - height * 0.65, "hidden": true},
 //    {"x":width * 0.85,"y":height - height * 0.65, "hidden": true},
	// ];

	$scope.colors = ['pink', 'purple', 'green', 'grey'];
	//$scope.paths.push(a);

	// Add coupling
	// $scope.paths[2][1].coupled = [
	// 	{"i":2, "j": 0, "type":'y'},
	// 	{"i":0, "j": 2, "type":'y'},
	// 	{"i":0, "j": 3, "type":'y'},
	// 	{"i":1, "j": 1, "type": 'y'},
	// 	{"i":1, "j": 0, "type": 'both'}
	// ];
	// $scope.paths[2][2].coupled = [
	// 	{"i": 2, "j": 3, "type":'y'},
	// 	{"i": 1, "j": 2, "type": 'y'}, 
	// 	{"i": 1, "j": 3, "type":'both'}
	// ];

// green #ccffcc
	var count = 8;

	var aBottom = height - height * 0.75;
	var bTop = height - height * 0.25;
	var difAB = bTop - aBottom;

	var slice = [
  	{"x":width * 0.15,"y":aBottom, "hidden": true},
  	{"x":width * 0.85,"y":aBottom, "hidden": true},
  	{"x":width,"y":aBottom, "hidden": true},
  	{"x":width,"y":aBottom + difAB / count, "hidden": true},
  	{"x":width * 0.85,"y":aBottom + difAB / count, "hidden": true},
	];

	$scope.paths.push(slice);
	b[1].coupled = [{"i": 0, "j": 0, "type":'both'}];
	b[2].coupled = [];

	for(var i = 0; i < count - 1; i++){
		var path = [];
		var ll = $scope.paths[$scope.paths.length - 1];
		for(var j = 0; j < ll.length; j++){
			if(j == 0){
				path.push({"x":ll[j].x, "y":ll[j].y, "hidden": true});
				b[1].coupled.push({"i": i + 1, "j": j, "type":'both'});
			} else {
				path.push({"x":ll[j].x, "y":ll[j].y + difAB / count, "hidden": true});
			}
		}
		$scope.paths.push(path);
	}
	$scope.paths.push(a);
	b[1].coupled.push(
		{"i": $scope.paths.length - 1, "j": 2, "type":'y'},
		{"i": $scope.paths.length - 1, "j": 3, "type":'y'}
	);

	$scope.paths.push(b);
	$scope.paths[$scope.paths.length - 1][1].coupled
		.push({"i": $scope.paths.length - 1, "j": 0, "type":'y'});
	$scope.paths[$scope.paths.length - 1][2].coupled
		.push({"i": $scope.paths.length - 1, "j": 3, "type":'y'});

	$scope.drawPaths = function(){
		var color = '';
		for(var i = 0; i < $scope.paths.length; i++){
			if(i == $scope.paths.length - 2 || i == $scope.paths.length - 1){
				color = '#00cc99';
			} else {
				if(i % 2 == 0){
					color = '#996633'; 
				} else {
					color = '#ecd9c6';
				}
			}
			//var color = '#'+Math.floor(Math.random()*16777215).toString(16)
			var top = $scope.vis.append('g')
				.attr('class', i);
			modelBuilder.drawPath(top, $scope.paths[i], i, color);
			modelBuilder.drawCircles(top, $scope.paths[i], i);
			d3.selectAll('#circle' + i).call(circleDrag);
		}
	};

	function moveCircle(){
		var m = d3.mouse(this);
		var x, y;

		// Check to see if we are in bounds for x
		if(m[0] > width){
			x = width;
		} else if(m[0] < 0){
			x = 0;
		} else {
			x = m[0];
		}

		// Check to see if we are in bounds for y
		if(m[1] > height){
			y = height;
		} else if(m[1] < 0){
			y = 0;
		} else {
			y = m[1];
		}

		var obj = d3.select(this);
			obj.attr('cx', x)
			.attr('cy', y);

		// Get the new bottom of the A section
		var aBottom = $scope.paths[$scope.paths.length - 2][2].y;

		// Get the new top of the B section
		var bTop = $scope.paths[$scope.paths.length - 1][3].y;

		// Get the difference between the top of the B section and bottom of the A section
		var difAB = bTop - aBottom;

		// Change root slice
		for(var i = 0; i < $scope.paths[0].length; i++){
			if(i < 3){
				$scope.paths[0][i].y = aBottom;
			} else {
				$scope.paths[0][i].y = aBottom + difAB / count;
			}
			if(i === 1 || i === 4){
				$scope.paths[0][i].x = $scope.paths[$scope.paths.length - 1][2].x;
			}
		}

		for(var w = 1; w < $scope.paths.length - 2; w++){
			for(var p = 1; p < $scope.paths[w].length; p++){
				$scope.paths[w][p].y = $scope.paths[w - 1][p].y + difAB / count;
				if(p === 1 || p === 4){
					$scope.paths[w][p].x = $scope.paths[$scope.paths.length - 1][2].x;
				}
			}
		}

		var parent = d3.select(this.parentNode);
		var i = parent.attr('class'), j = obj.attr('class');
		$scope.paths[i][j].x = x;
		$scope.paths[i][j].y = y;
		if($scope.paths[i][j].coupled){
			var cPaths = $scope.paths[i][j].coupled;
			for(var k = 0; k < cPaths.length; k++){

				if(cPaths[k].type == 'y'){
					$scope.paths[cPaths[k].i][cPaths[k].j].y = y;
				} else if(cPaths[k].type == 'x'){
					$scope.paths[cPaths[k].i][cPaths[k].j].x = x;
				} else {
					$scope.paths[cPaths[k].i][cPaths[k].j].y = y;
					$scope.paths[cPaths[k].i][cPaths[k].j].x = x;
				}
			}
		}
		
		for(var i = 0; i < $scope.paths.length; i++){
			var path = d3.select('#path' + i);
			path.transition().duration(5).attr('d', lineFunction($scope.paths[i])).ease('linear');
		}
	};

	$scope.drawPaths();

});