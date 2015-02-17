app.BreakdownDetail = Backbone.View.extend({
    tagName: 'tr',
    className: 'expanded-content',
    chartOpts: window.sparkLineOpts,

    events: {
        'click .breakdown': 'breakdownNav'
    },
    initialize: function(){
        console.log("*** in BreakdownDetail initialize")
        this._modelBinder = new Backbone.ModelBinder();
    },
    render: function(){
        console.log("*** in BreakdownDetail render")
        this.$el.html(BudgetHelpers.template_cache('breakdownDetail', {model: this.model}));
        this._modelBinder.bind(this.model, this.el, {
            prevYearRange: '.prevYearRange',
            actualChange: '.actualChange',
            estChange: '.estChange'
        });
        return this;
    },

    breakdownNav: function(e){
        console.log("*** in BreakdownDetail breakdownNav")
        var filter = {}
        var typeView = this.model.get('type');
        filter[typeView] = this.model.get('rowName')
        var path = this.model.get('slug');
        if (this.model.get('parent')){
            var hierarchy = collection.hierarchy[collection.topLevelView]
            var type_pos = hierarchy.indexOf(typeView)
            var parent_type = hierarchy[type_pos - 1];
            filter[parent_type] = this.model.get('parent');
            path = BudgetHelpers.convertToSlug(this.model.get('parent')) + '/' + this.model.get('slug')
        }
        collection.updateTables(this.model.get('child'), this.model.get('rowName'), filter, this.model.get('year'));
        document.title = document.title + ' | ' + this.model.get('rowName');
        $('#secondary-title').text(this.model.get('child'));
        var pathStart = null;
        if(collection.topLevelView == 'Function'){
            pathStart = 'function-detail/';
        } else if(collection.topLevelView == 'Fund Type') {
            pathStart = 'fund-type-detail/';
        }
        $('html, body').animate({
            scrollTop: $('#breadcrumbs').offset().top
        });
        if (debugMode == true) {
            console.log('navigating ...')
            console.log(pathStart);
            console.log(path);
            console.log(this.model.get('year'));

        }
        app_router.navigate(pathStart + path + '?year=' + this.model.get('year'));
        collection.mainChartView.updateCrumbs();
    },

    updateChart: function(){
        console.log("*** in BreakdownDetail updateChart")
        if (typeof this.highChart !== 'undefined'){
            delete this.highChart;
        }
        var data = this.model;
        var nom_actuals = [];
        var nom_est = [];
        $.each(data.allActuals, function(i, e){
            if (isNaN(e)){
                e = null;
            }
            nom_actuals.push(e);
        })
        $.each(data.allEstimates, function(i, e){
            if (isNaN(e)){
                e = null;
            }
            nom_est.push(e);
        });
        var minValuesArray = $.grep(nom_est.concat(nom_actuals),
          function(val) { return val != null; });
        if (debugMode == true){
            console.log("minValuesArray");
            console.log(minValuesArray);
        }

        var globalOpts = app.GlobalChartOpts;
        // chart options for detail charts
        this.chartOpts.chart.renderTo = data.get('slug') + "-selected-chart";
        this.chartOpts.chart.marginBottom = 20;
        this.chartOpts.plotOptions.area.pointInterval = globalOpts.pointInterval
        this.chartOpts.plotOptions.area.pointStart = Date.UTC(collection.startYear, 1, 1)

        if (projectionStartYear){
            this.chartOpts.xAxis.plotBands = [{
                    from: Date.UTC(projectionStartYear, -5, 0),
                    to: Date.UTC(endYear, 1, 0),
                    color: globalOpts.projectionBandColor
                }]
            }

        this.chartOpts.yAxis.min = 0
        this.chartOpts.plotOptions.series.point.events.click = this.pointClick;
        this.chartOpts.yAxis.title = {  enabled: true,
                                        text: 'Real dollars ('+benchmark+')' }

        // adjust for inflation
        actual = BudgetHelpers.inflationAdjust(nom_actuals, inflation_idx, benchmark, startYear);
        est = BudgetHelpers.inflationAdjust(nom_est, inflation_idx, benchmark, startYear);

        if (mergeSeries){
            // add estimates to the end of actuals series
            for (var i = 1; i < est.length; i++) {
                if (est[i]!==null && actual[i]==null){
                    actual[i] = est[i]
                }
            }
            this.chartOpts.series = [{
                color: globalOpts.actualColor,
                data: actual,
                marker: {
                  radius: 5,
                  symbol: globalOpts.actualSymbol
                },
                name: globalOpts.actualTitle
            }]
        }
        else{
            this.chartOpts.series = [{
                color: globalOpts.estColor,
                data: est,
                marker: {
                  radius: 4,
                  symbol: globalOpts.estSymbol
                },
                name: globalOpts.estTitle
                }, {
                color: globalOpts.actualColor,
                data: actual,
                marker: {
                  radius: 5,
                  symbol: globalOpts.actualSymbol
                },
                name: globalOpts.actualTitle
            }]
        }


        this.chartOpts.tooltip = {
            borderColor: "#000",
            formatter: function() {
                year = parseInt(Highcharts.dateFormat("%Y", this.x))
                var year_range = BudgetHelpers.convertYearToRange(year);
            
                var s = "<strong>" + year_range + "</strong>";
                $.each(this.points, function(i, point) {
                    s += "<br /><span style=\"color: " + point.series.color + "\">" + point.series.name + ":</span> $" + Highcharts.numberFormat(point.y, 0);
                });
              
                var unadjusted = {}
                unadjusted[globalOpts.actualTitle] = BudgetHelpers.unadjustedObj(nom_actuals, startYear)
                unadjusted[globalOpts.estTitle] = BudgetHelpers.unadjustedObj(nom_est, startYear)
                s+= "<br><span style=\"color:#7e7e7e\">Nominal: "+ BudgetHelpers.convertToMoney(unadjusted[globalOpts.actualTitle][year])+"</span>" // FIX THIS
                return s;
            },
            shared: true
        }

        // select current year
        var selectedYearIndex = this.model.get('year') - collection.startYear;
        this.highChart = new Highcharts.Chart(this.chartOpts, function(){
            this.series[0].data[selectedYearIndex].select(true, true);
            if(this.series[1]) this.series[1].data[selectedYearIndex].select(true, true);
        });
    },

    // Handler for the click events on the points on the chart
    pointClick: function(e){
        console.log("*** in BreakdownDetail pointClick")
        $("#readme").fadeOut("fast");
        $.cookie("budgetbreakdownreadme", "read", { expires: 7 });
        var x = this.x,
        y = this.y,
        selected = !this.selected,
        index = this.series.index;
        this.select(selected, false);
        var active_chart;
        $.each($('.budget-chart'), function(i, chart){
          var sel_points = $(chart).highcharts().getSelectedPoints();
          $.each(sel_points, function(i, point){
              point.select(false);
          });
          $.each($(chart).highcharts().series, function(i, serie){
              $(serie.data).each(function(j, point){
                if(x === point.x && point.y != null) {
                  active_chart = chart;
                  point.select(selected, true);
                }
              });
          });
        });
        var clickedYear = new Date(x).getFullYear();
        var yearIndex = this.series.processedYData.indexOf(y);
        var hash = window.location.hash;
        if(hash.indexOf('?') >= 0){
            hash = hash.slice(0, hash.indexOf('?'));
        }
        app_router.navigate(hash + '?year=' + clickedYear);
        collection.updateYear(clickedYear, yearIndex);
        $.each($('.bars').children(), function(i, bar){
            var width = $(bar).text();
            $(bar).css('width', width);
        });
    }
});