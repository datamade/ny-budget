app.MainChartView = Backbone.View.extend({
    el: $('#main-chart'),

    // The bulk of the chart options are defined in the budget_highcharts.js file
    // and attached to the window over there. Dunno if that's the best approach but it works
    chartOpts: window.mainChartOpts,

    events: {
        'click .breakdown-choice': 'changeBreakdown',
        'click .onoffswitch-checkbox': 'changeAdjustment'
    },

    // Render the view when you initialize it.
    initialize: function(){
        this._modelBinder = new Backbone.ModelBinder();
        this.render();
        this.updateCrumbs();
    },
    updateCrumbs: function(){
        console.log("*** in MainChartView pdateCrumbs")
        var links = ['<a href="/">'+municipalityName+'</a>'];
        if(Backbone.history.fragment){
            var parts = Backbone.history.fragment;
            if (parts.indexOf('?') >= 0){
                var idx = parts.indexOf('?');
                parts = parts.slice(0,idx).split('/')
            } else {
                parts = parts.split('/');
            }
            var crumbs = parts.slice(1, parts.length);
            var topView = collection.topLevelView;
            var query = {}
            $.each(crumbs, function(i, crumb){
                var link = '<a href="#' + parts.slice(0,i+2).join('/') + '">';
                if(i==0){
                    var key = topView + ' Slug';
                    query[key] = crumb;
                    link += collection.findWhere(query).get(topView);
                }
                if(i==1){
                    var level1 = collection.hierarchy[topView][1]
                    query[level1 + ' Slug'] = crumb;
                    link += collection.findWhere(query).get(level1);
                }
                if(i==2){
                    var level2 = collection.hierarchy[topView][2]
                    query[level2 + ' Slug'] = crumb;
                    link += collection.findWhere(query).get(level2);
                }
                link += '</a>';
                links.push(link);
            });
        }
        $('#breadcrumbs').html(links.join(' > '));
    },
    // This is where the magic happens. Grab the template from the template_cache function
    // at the top of this file and then update the chart with what's passed in as the model.
    render: function(){
        console.log("*** in MainChartView render")
        this.$el.html(BudgetHelpers.template_cache('mainChart', {model: this.model}));
        this._modelBinder.bind(this.model, this.el, {
            viewYearRange: '.viewYear',
            prevYearRange: '.prevYear',
            selectedActual: '.actuals',
            selectedEst: '.estimates',
            actualChange: '.actualChange',
            estChange: '.estChange'
        });
        this.updateChart(this.model, this.model.get('viewYear'), this.model.get('isInflationAdjusted'));
        return this;
    },
    updateChart: function(data, year, isInflationAdjusted){
        console.log("*** in MainChartView updateChart")
        if (typeof this.highChart !== 'undefined'){
            delete this.highChart;
        }
        var nominal_actuals = jQuery.extend(true, [], data.get('actuals'));
        var nominal_ests = jQuery.extend(true, [], data.get('estimates'));

        if (debugMode == true) {
            console.log('main chart data:')
            console.log(actuals);
            console.log(ests);
        }

        if (isInflationAdjusted){
            var main_chart_actuals = BudgetHelpers.inflationAdjustSeries(nominal_actuals, inflation_idx, benchmark, startYear);
            var main_chart_ests = BudgetHelpers.inflationAdjustSeries(nominal_ests, inflation_idx, benchmark, startYear);
            var legend_append = ' (in '+benchmark+' dollars)'
        }
        else{
            var main_chart_actuals = nominal_actuals
            var main_chart_ests = nominal_ests
            var legend_append = ' (not adjusted for inflation)'
        }

        var minValuesArray = $.grep(main_chart_ests.concat(main_chart_actuals),
          function(val) { return val != null; });
        var globalOpts = app.GlobalChartOpts;
        // chart options for main chart
        this.chartOpts.chart.borderWidth = 0;
        this.chartOpts.plotOptions.area.pointInterval = globalOpts.pointInterval;
        this.chartOpts.plotOptions.area.pointStart = Date.UTC(collection.startYear, 1, 1);
        this.chartOpts.plotOptions.series.point.events.click = this.yearClick;
        if (mergeSeries){
            // add estimates to the end of actuals series
            for (var i = 1; i < main_chart_ests.length; i++) {
                if (main_chart_ests[i] && (main_chart_actuals[i]==null || isNaN(main_chart_actuals))){
                    main_chart_actuals[i] = main_chart_ests[i]
                }
            }
            this.chartOpts.series = [{
                color: globalOpts.actualColor,
                data: main_chart_actuals,
                legendIndex: 1,
                marker: {
                    radius: 6,
                    symbol: globalOpts.actualSymbol
                },
                name: 'Budget'
            }];
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
                data: main_chart_ests,
                legendIndex: 2,
                marker: {
                    radius: 6,
                    symbol: globalOpts.estSymbol
                },
                name: globalOpts.estTitle
                }, {
                color: globalOpts.actualColor,
                data: main_chart_actuals,
                legendIndex: 1,
                marker: {
                    radius: 6,
                    symbol: globalOpts.actualSymbol
                },
                name: globalOpts.actualTitle
            }];
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

        if (projectionStartYear){
            this.chartOpts.xAxis.plotBands = [{
                    from: Date.UTC(projectionStartYear, -5, 0),
                    to: Date.UTC(endYear, 1, 0),
                    color: globalOpts.projectionBandColor,
                    label: {
                        text: 'Estimated'
                    }
                }]
            }

        this.chartOpts.yAxis.min = 0
        this.chartOpts.legend.labelFormatter = function () {
                return this.name + legend_append;
            }

        var selectedYearIndex = year - collection.startYear;
        this.highChart = new Highcharts.Chart(this.chartOpts, function(){
            this.series[0].data[selectedYearIndex].select(true, true);
            if(this.series[1]) this.series[1].data[selectedYearIndex].select(true, true);
        });
    },
    yearClick: function(e){
        console.log("*** in MainChartView yearClick")
        $("#readme").fadeOut("fast");
        $.cookie("budgetbreakdownreadme", "read", { expires: 7 });
        var x = this.x,
        y = this.y,
        selected = !this.selected,
        index = this.series.index;
        this.select(selected, false);

        $.each($('.budget-chart'), function(i, chart){
          var sel_points = $(chart).highcharts().getSelectedPoints();
          $.each(sel_points, function(i, point){
              point.select(false);
          });
          $.each($(chart).highcharts().series, function(i, serie){
              $(serie.data).each(function(j, point){
                if(x === point.x && point.y != null) {
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

        app_router.navigate(hash + '?' + new_q );
        collection.updateYear(clickedYear, yearIndex);
        $.each($('.bars').children(), function(i, bar){
            var width = $(bar).text();
            $(bar).css('width', width);
        });
    },
    changeBreakdown: function(e){
        console.log("*** in MainChartView changeBreakdown")
        e.preventDefault();
        var view = $(e.currentTarget).data('choice');
        var year = window.location.hash.split('=')[1];
        if (year==undefined){
            year = activeYear;
        }
        app_router.navigate('?year=' + year);
        collection.updateTables(view, municipalityName, undefined, year, true); //CHANGE THIS
    },
    changeAdjustment: function(e){
        console.log("*** in MainChartView changeAdjustment")
        var view = 'Function' //// CHANGE THIS
        var year = window.location.hash.split('=')[1];
        if (year==undefined){
            year = activeYear;
        }
        if ($(e.currentTarget).is(":checked")){
            collection.updateTables(view, municipalityName, undefined, year, true);
        }
        else{
            collection.updateTables(view, municipalityName, undefined, year, false);
        }

    }
})