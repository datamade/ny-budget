app.MainChartView = Backbone.View.extend({
    el: $('#main-chart'),

    // The bulk of the chart options are defined in the budget_highcharts.js file
    // and attached to the window over there. Dunno if that's the best approach but it works
    chartOpts: window.mainChartOpts,

    events: {
        'click .breakdown-choice': 'breakIt'
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
            selectedExp: '.actuals',
            selectedEst: '.estimates',
            expChange: '.expChange',
            estChange: '.estChange'
        });
        this.updateChart(this.model, this.model.get('viewYear'));
        return this;
    },
    updateChart: function(data, year){
        console.log("*** in MainChartView updateChart")
        if (typeof this.highChart !== 'undefined'){
            delete this.highChart;
        }
        var exps = jQuery.extend(true, [], data.get('actuals'));
        var ests = jQuery.extend(true, [], data.get('estimates'));

        if (debugMode == true) {
            console.log('main chart data:')
            console.log(exps);
            console.log(ests);
        }

        var exp = BudgetHelpers.inflationAdjust(exps, inflation_idx, benchmark, startYear);
        var est = BudgetHelpers.inflationAdjust(ests, inflation_idx, benchmark, startYear);

        var minValuesArray = $.grep(est.concat(exp),
          function(val) { return val != null; });
        var globalOpts = app.GlobalChartOpts;
        // chart options for main chart
        this.chartOpts.chart.borderWidth = 0;
        this.chartOpts.plotOptions.area.pointInterval = globalOpts.pointInterval;
        this.chartOpts.plotOptions.area.pointStart = Date.UTC(collection.startYear, 1, 1);
        this.chartOpts.plotOptions.series.point.events.click = this.pointClick;
        var extra_point = {
                y: 0,
                marker: {
                    enabled: false
                },
                enableMouseTracking: false
            }
        // copy over the last actual value as first estimated value, to fill gap in line
        for (var i = 1; i < est.length; i++) {
            if (est[i]!==null && exp[i-1]!==null){
                extra_point['y']= exp[i-1]
                est[i-1] = extra_point
            }
        }
        this.chartOpts.series = [{
            color: globalOpts.estColor,
            data: est,
            legendIndex: 2,
            marker: {
                radius: 6,
                symbol: globalOpts.estSymbol
            },
            name: globalOpts.estTitle
          }, {
            color: globalOpts.expendColor,
            data: exp,
            legendIndex: 1,
            marker: {
                radius: 6,
                symbol: globalOpts.expendSymbol
            },
            name: globalOpts.expendTitle
        }];
        this.chartOpts.yAxis.min = 0
        this.chartOpts.yAxis.title = {
            enabled: true,
            text: 'Real dollars ('+benchmark+')'}
        this.chartOpts.tooltip = {
            borderColor: "#000",
            formatter: function() {
              year = parseInt(Highcharts.dateFormat("%Y", this.x))
              var year_range = BudgetHelpers.convertYearToRange(year);
            
              // // Use this code to display both series in the tooltip
              // // (for when years have both estimates & actual data)
              // var s = "<strong>" + year_range + "</strong>";
              // $.each(this.points, function(i, point) {
              //   s += "<br /><span style=\"color: " + point.series.color + "\">" + point.series.name + ":</span> $" + Highcharts.numberFormat(point.y, 0);
              // });
              
              // This only takes one series in the tooltip - makes estimate override expenditure if estimate exists
              // (this is for when estimates & actuals span different years, & is necessary
              // b/c of the hack to fill in the space between estimates & actuals series)
                var series_name;
                $.each(this.points, function(i, point) {
                    s = "<strong>" + year_range + " <span style=\"color: " + point.series.color + "\">" + point.series.name + "</span></strong><br />Real: $" + Highcharts.numberFormat(point.y, 0);
                    series_name = point.series.name;
                });
                var unadjusted = {}
                unadjusted['Actuals'] = BudgetHelpers.unadjustedObj(exps, startYear)
                unadjusted['Estimates'] = BudgetHelpers.unadjustedObj(ests, startYear)
                s+= "<br><span style=\"color:#7e7e7e\">Nominal: "+ BudgetHelpers.convertToMoney(unadjusted[series_name][year])+"</span>"

                return s;
            },
            shared: true
        }

        var selectedYearIndex = year - collection.startYear;
        this.highChart = new Highcharts.Chart(this.chartOpts, function(){
            this.series[0].data[selectedYearIndex].select(true, true);
            this.series[1].data[selectedYearIndex].select(true, true);
        });
    },
    pointClick: function(e){
        console.log("*** in MainChartView pointClick")
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
        if(hash.indexOf('?') >= 0){
            hash = hash.slice(0, hash.indexOf('?'));
        }
        app_router.navigate(hash + '?year=' + clickedYear);
        collection.updateYear(clickedYear, yearIndex);
        $.each($('.bars').children(), function(i, bar){
            var width = $(bar).text();
            $(bar).css('width', width);
        });
    },
    breakIt: function(e){
        console.log("*** in MainChartView breakIt")
        e.preventDefault();
        var view = $(e.currentTarget).data('choice');
        var year = window.location.hash.split('=')[1];
        if (year==undefined){
            year = activeYear;
        }
        app_router.navigate('?year=' + year);
        collection.updateTables(view, municipalityName, undefined, year);
    }
})