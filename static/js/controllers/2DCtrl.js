
app.controller('2DCtrl', function ($scope, $http, $alert) {

    $scope.zDomain = ['depth', 'time'];
    $scope.zAxisDomain = 'depth';
    $scope.zRange = 1000;

    // TODO update from mouse over on seismic plots
    $scope.trace = 10;
    $scope.traceStr = "10";
    $scope.offset = 3;
    $scope.offsetStr = "3";
    $scope.twt = 30;
    $scope.twtStr = "30";


    // TODO get from app before so we get the prod url
    $scope.server = 'http://localhost:8081';

    $scope.theta = [0, 3, 6, 9, 12, 15, 18, 21, 24, 27, 30];
    $scope.popover = {
	   title: "Models",
	   content: "Choose a model framework from the carousel below, or use the buttons to the right to upload an image or create a new model with the model builder. then assign the model's rocks and other parameters in the panel to the right."
    };

    $http.get('/image_model?all')
      .then(function(response) {
        $scope.images = response.data;

        if($scope.images.length > 0){
          $scope.curImage = $scope.images[0];

	  	    for(var i = 0; i < $scope.images.length; i++){
	  	      $scope.images[i].rocks = [];
	  	      for(var j = 0; j < $scope.images[i].colours.length; j++){
	  	        var rand = $scope.rocks[Math.floor(Math.random() * $scope.rocks.length)];
              $scope.images[i].rocks.push(rand);
	  	      }
	  	    }
        }
      }
    );
    
    // populate the rocks
    $http.get('/rock?all').
        then(function(response) {
            // this callback will be called asynchronously
            // when the response is available
            $scope.rocks = response.data;
        });

    $scope.loadSaved = function(){
      var array = $.map($scope.savedEarthModel.mapping, function(value, index) {
        return [value];
      });

      $scope.curImage.rocks = [];
      for(var i = 0; i < array.length; i++){
        $scope.curImage.rocks.push(array[i]);
      }
    }

    $scope.changeRock = function(){
      //console.log($scope.curImage);
    };
    
    $scope.slideClick = function(slider){
    	$scope.curImage = $scope.images[slider.element.currentSlide];
    };

    $scope.updatePlot = function(){
        $scope.update_data();
    };

    $scope.update_data = function(){

      var earth_model = $scope.makeEarthModelStruct();
        
      var seismic = {
        frequency: 20.0,
        wavelet: "ricker", dt: 0.001
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
          //$scope.seismic = response.data;
          console.log(response.data);
          $scope.plot(response.data);
          $scope.maxTrace = String(response.data.seismic.length);
          $scope.maxTWT = String(response.data.seismic[0].length);
          $scope.updateClicked = true;
        });
    };

    $scope.changeTraceStr = function(){
      $scope.trace = Number($scope.traceStr);
    };
    $scope.changeTraceNum = function(){
      $scope.traceStr = String($scope.trace);
    }
    $scope.changeTWTStr = function(){
      $scope.twt = Number($scope.twtStr);
    };
    $scope.changeTWTNum = function(){
      $scope.twtStr = String($scope.twt);
    }
    $scope.changeGainStr = function(){
      $scope.gain = Number($scope.gainStr);
    };
    $scope.changeGainNum = function(){
      $scope.gainStr = String($scope.gain);
    }
    $scope.changeOffsetStr = function(){
      $scope.offset = Number($scope.offsetStr);
    };
    $scope.changeOffsetNum = function(){
      $scope.offsetStr = String($scope.offset);
    }

    $scope.plot = function(data){

    	var max;
    	if(Math.abs(data.max) > Math.abs(data.min)){
        max = Math.abs(data.max);
    	} else {
        max = Math.abs(data.min);
    	}

    	var height = 300;
    	var width = $('.vd_plot').width();

      // Variable Density Plot
      if(!$scope.vDPlot){
      	$scope.vDPlot = g3.plot('.vd_plot')
          .setHeight(height)
          .setXTitle("spatial cross-section")
          .setYTitle("time [ms]")
          .setWidth(width - 30)
          .toggleX2Axis(true)
          .toggleY2Axis(true)
          .setXTickFormat("")
          .setX2TickFormat("")
          .setY2TickFormat("")
          .setMargin(30,10,5,40)
         	.setXDomain([0, data.seismic.length])
          .setYDomain([0, data.seismic[0].length])
          .setX2Domain([0, data.seismic.length])
          .setY2Domain([0, data.seismic[0].length])
          .draw();
        } else {
          $scope.vDPlot.reDraw(
            [0, data.seismic.length], 
            [0, data.seismic[0].length], 
            [0, data.seismic.length], 
            [0, data.seismic[0].length]
          );
        }

	// var vDLog = g3.wiggle(vDPlot, data.seismic[34])
	//     //.setYInt(data.dt)
	//     //.setXInt(data.dx)
	//     //.setSampleRate(1)
	//     //.setSkip(10)
	//     .setGain(50)
	//     .draw();

      if(!$scope.seis){
      	$scope.seis = g3.seismic($scope.vDPlot, data.seismic)
  	    	.setMax(max)
  	    	.setGain(100)
  	    	.draw();
      } else {
        $scope.seis.reDraw(data.seismic);
      }

      // Offset Gather Plot
    	width = $('.og_plot').width();
      if(!$scope.oGPlot){
      	$scope.oGPlot = g3.plot('.og_plot')
      		.setHeight(height)
      		.setWidth(width - 30)
          .setXTitle("angle gather")
      		.toggleX2Axis(true)
          .setX2Ticks(6)
      		.toggleY2Axis(true)
      		.setXTickFormat("")
          .setX2TickFormat("")
      		.setYTickFormat("")
      		.setY2TickFormat("")
      		.setMargin(30,10,5,30)
      		.setXDomain([0, data.offset_gather.length])
      		.setYDomain([0, data.offset_gather[0].length])
      		.setX2Domain([0, data.offset_gather.length])
      		.setY2Domain([0, data.offset_gather[0].length])
      		.draw();
        } else {
          $scope.oGPlot.reDraw(
            [0, data.offset_gather.length], 
            [0, data.offset_gather[0].length], 
            [0, data.offset_gather.length], 
            [0, data.offset_gather[0].length]
          );
        }

      if(!$scope.og){
      	$scope.og = g3.seismic($scope.oGPlot, data.offset_gather)
      		.setMax(max)
      		.setGain(100)
      		.draw();
        } else {
          $scope.og.reDraw(data.offset_gather);
        }

      // Wavelet Gather Plot
      var width = $('.wg_plot').width();
      if(!$scope.wGPlot){
      	$scope.wGPlot = g3.plot('.wg_plot')
      		.setHeight(height)
      		.setWidth(width - 30)
          .setXTitle("wavelet gather")
      		.toggleX2Axis(true)
          .setX2Ticks(6)
      		.toggleY2Axis(true)
      		.setXTickFormat("")
          .setX2TickFormat("")
      		.setYTickFormat("")
      		.setY2TickFormat("")
      		.setMargin(30,10,5,20)
      		.setXDomain([0, data.wavelet_gather.length])
      		.setYDomain([0, data.wavelet_gather[0].length])
      		.setX2Domain([0, data.wavelet_gather.length])
      		.setY2Domain([0, data.wavelet_gather[0].length])
      		.draw();
        } else {
          $scope.wGPlot.reDraw(
            [0, data.wavelet_gather.length], 
            [0, data.wavelet_gather[0].length], 
            [0, data.wavelet_gather.length], 
            [0, data.wavelet_gather[0].length]
          );
        }

      if(!$scope.wg){
      	$scope.wg = g3.seismic($scope.wGPlot, data.wavelet_gather)
      		.setMax(max)
      		.setGain(100)
      		.draw();
      } else {
        $scope.wg.reDraw(data.wavelet_gather);
      }

      // Amplitude Trace
      var width = $('.at_plot').width();
      var height = 100;
      if(!$scope.aTPlot){
        $scope.aTPlot = g3.plot('.at_plot')
          .setHeight(height)
          .setYTitle("amplitude")
          .setWidth(width - 30)
          .toggleX2Axis(true)
          .toggleY2Axis(true)
          .setXTickFormat("")
          .setY2TickFormat("")
          .setMargin(5,10,40,40)
          .setXDomain([0, data.seismic.length])
          .setYDomain([0, data.seismic[0].length])
          .setX2Domain([0, data.seismic.length])
          .setY2Domain([0, data.seismic[0].length])
          .draw();
        } else {
          $scope.aTPlot.reDraw(
            [0, data.seismic.length], 
            [0, data.seismic[0].length], 
            [0, data.seismic.length], 
            [0, data.seismic[0].length]
          );
        }

      // Amplitude Offset Plot
      width = $('.ao_plot').width();
      if(!$scope.aOPlot){
        $scope.aOPlot = g3.plot('.ao_plot')
          .setHeight(height)
          .setWidth(width - 30)
          .toggleX2Axis(true)
          .setX2Ticks(6)
          .toggleY2Axis(true)
          .setXTickFormat("")
          .setYTickFormat("")
          .setY2TickFormat("")
          .setMargin(5,10,40,30)
          .setXDomain([0, data.offset_gather.length])
          .setYDomain([0, data.offset_gather[0].length])
          .setX2Domain([0, data.offset_gather.length])
          .setY2Domain([0, data.offset_gather[0].length])
          .draw();
        } else {
          $scope.aOPlot.reDraw(
            [0, data.offset_gather.length], 
            [0, data.offset_gather[0].length], 
            [0, data.offset_gather.length], 
            [0, data.offset_gather[0].length]
          );
        }

      // Amplitude Freq Plot
      var width = $('.af_plot').width();
      if(!$scope.aFPlot){
        $scope.aFPlot = g3.plot('.af_plot')
          .setHeight(height)
          .setWidth(width - 30)
          .toggleX2Axis(true)
          .setX2Ticks(6)
          .toggleY2Axis(true)
          .setXTickFormat("")
          .setYTickFormat("")
          .setY2TickFormat("")
          .setMargin(5,10,40,20)
          .setXDomain([0, data.wavelet_gather.length])
          .setYDomain([0, data.wavelet_gather[0].length])
          .setX2Domain([0, data.wavelet_gather.length])
          .setY2Domain([0, data.wavelet_gather[0].length])
          .draw();
        } else {
          $scope.aFPlot.reDraw(
            [0, data.wavelet_gather.length], 
            [0, data.wavelet_gather[0].length], 
            [0, data.wavelet_gather.length], 
            [0, data.wavelet_gather[0].length]
          );
        }

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
});
