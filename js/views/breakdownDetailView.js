app.BreakdownDetail = Backbone.View.extend({
    tagName: 'tr',
    className: 'expanded-content',
    chartOpts: window.sparkLineOpts,

    events: {
        'click .breakdown': 'breakdownNav'
    },
    initialize: function(){
        // console.log("*** in BreakdownDetail initialize")
        this._modelBinder = new Backbone.ModelBinder();
    },
    render: function(){
        // console.log("*** in BreakdownDetail render")
        this.$el.html(BudgetHelpers.template_cache('breakdownDetail', {model: this.model}));
        this._modelBinder.bind(this.model, this.el, {
            prevYearRange: '.prevYearRange',
            actualChange: '.actualChange',
            estChange: '.estChange'
        });
        return this;
    },

    breakdownNav: function(e){
        // console.log("*** in BreakdownDetail breakdownNav")
        var filter = {}
        var typeView = this.model.get('type');
        filter[typeView] = this.model.get('rowName')
        var path = this.model.get('slug');
        var filter_param_str = 'filter_1='+this.model.get('slug');
        if (this.model.get('parent')){
            var hierarchy = collection.hierarchy_current
            var type_pos = hierarchy.indexOf(typeView)
            var parent_type = hierarchy[type_pos - 1];
            filter[parent_type] = this.model.get('parent');
            path = BudgetHelpers.convertToSlug(this.model.get('parent')) + '/' + this.model.get('slug')
            filter_param_str = 'filter_1='+BudgetHelpers.convertToSlug(this.model.get('parent'))+'&filter_2='+this.model.get('slug')
        }
        isInflationAdjusted = this.model.get('isInflationAdjusted')

        var hash = window.location.hash;
        var q = ''
        if(hash.indexOf('?') >= 0){
            q = hash.slice(hash.indexOf('?'))
        }

        if (q==''){
            q = '?'+filter_param_str
        }
        else{
            q = q+'&'+filter_param_str
        }


        clean_params = app_router.string2params(q)
        new_q = app_router.params2string(clean_params)

        var pathStart = null;
        if (clean_params.breakdown == 'Function'){
            pathStart = 'function-detail/';
        } else if(clean_params.breakdown == 'Fund Type') {
            pathStart = 'fund-type-detail/';
        }

        app_router.navigate('?'+new_q);

        collection.updateTables();
        document.title = document.title + ' | ' + this.model.get('rowName');

        $('html, body').animate({
            scrollTop: $('#breadcrumbs').offset().top
        });

        if (debugMode == true) {
            console.log('navigating ...')
            console.log(pathStart);
            console.log(path);
            console.log(this.model.get('year'));

        }

        collection.mainChartView.updateCrumbs();
    },

    updateChart: function(){
        // console.log("*** in BreakdownDetail updateChart")
        if (typeof this.highChart !== 'undefined'){
            delete this.highChart;
        }
        var data = this.model;
        var nominal_actuals = data.allActuals;
        var nominal_ests = data.allEstimates;

        if (this.model.get('isInflationAdjusted')){
            var detail_chart_actuals = BudgetHelpers.inflationAdjustSeries(nominal_actuals, inflation_idx, benchmark, startYear)
            var detail_chart_ests = BudgetHelpers.inflationAdjustSeries(nominal_ests, inflation_idx, benchmark, startYear)
        }
        else{
            var detail_chart_actuals = nominal_actuals
            var detail_chart_ests = nominal_ests
        }

        var minValuesArray = $.grep(detail_chart_ests.concat(detail_chart_actuals),
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

        // add a plot band
        if (projectionStartYear){
            this.chartOpts.xAxis.plotBands = [{
                    from: Date.UTC(projectionStartYear, plotBandBuffer, 0),
                    to: Date.UTC(endYear, 1, 0),
                    color: globalOpts.projectionBandColor
                }]
            }

        this.chartOpts.yAxis.min = 0
        this.chartOpts.plotOptions.series.point.events.click = this.yearClick;

        if (mergeSeries){
            // add estimates to the end of actuals series
            for (var i = 1; i < detail_chart_ests.length; i++) {
                if (detail_chart_ests[i] && (detail_chart_actuals[i]==null || isNaN(detail_chart_actuals[i]))){
                    detail_chart_actuals[i] = detail_chart_ests[i]
                }
            }
            this.chartOpts.series = [{
                color: globalOpts.actualColor,
                data: detail_chart_actuals,
                marker: {
                  radius: 5,
                  symbol: globalOpts.actualSymbol
                },
                name: 'Budget'
            }]
            this.chartOpts.tooltip = {
                borderColor: "#000",
                formatter: function() {
                    year = parseInt(Highcharts.dateFormat("%Y", this.x))
                    var year_range = BudgetHelpers.convertYearToRange(year);
                
                    var s = "<strong>" + year_range + "</strong>";
                    $.each(this.points, function(i, point) {
                        s += "<br /><span style=\"color: " + point.series.color + "\">$" + Highcharts.numberFormat(point.y, 0) + "</span>";
                    });
                    return s;
                },
                shared: true
            }
        }
        else{
            this.chartOpts.series = [{
                color: globalOpts.estColor,
                data: detail_chart_ests,
                marker: {
                  radius: 4,
                  symbol: globalOpts.estSymbol
                },
                name: globalOpts.estTitle
                }, {
                color: globalOpts.actualColor,
                data: detail_chart_actuals,
                marker: {
                  radius: 5,
                  symbol: globalOpts.actualSymbol
                },
                name: globalOpts.actualTitle
            }]
            this.chartOpts.tooltip = {
                borderColor: "#000",
                formatter: function() {
                    year = parseInt(Highcharts.dateFormat("%Y", this.x))
                    var year_range = BudgetHelpers.convertYearToRange(year);
                
                    var s = "<strong>" + year_range + "</strong>";
                    $.each(this.points, function(i, point) {
                        s += "<br /><span style=\"color: " + point.series.color + "\">" + point.series.name + ":</span> $" + Highcharts.numberFormat(point.y, 0);
                    });
                    return s;
                },
                shared: true
            }
        }

        // select current year
        var selectedYearIndex = this.model.get('year') - collection.startYear;
        this.highChart = new Highcharts.Chart(this.chartOpts, function(){
            this.series[0].data[selectedYearIndex].select(true, true);
            if(this.series[1]) this.series[1].data[selectedYearIndex].select(true, true);
        });
    },

    // Handler for the click events on the points on the chart
    yearClick: function(e){
        // console.log("*** in BreakdownDetail yearClick")
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
        var q = ''
        if(hash.indexOf('?') >= 0){
            q = hash.slice(hash.indexOf('?'))
            hash = hash.slice(0, hash.indexOf('?'));
        }
        params = app_router.string2params(q)
        params.year = clickedYear
        var new_q = app_router.params2string(params)

        app_router.navigate('?' + new_q);
        collection.updateYear(clickedYear, yearIndex);
        $.each($('.bars').children(), function(i, bar){
            var width = $(bar).text();
            $(bar).css('width', width);
        });
    }
});