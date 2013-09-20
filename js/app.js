(function(){
    var app = {}

    // Builds a cache of templates that get fetched and rendered by views
    function template_cache(tmpl_name, tmpl_data){
        if ( !template_cache.tmpl_cache ) {
            template_cache.tmpl_cache = {};
        }

        if ( ! template_cache.tmpl_cache[tmpl_name] ) {
            var tmpl_dir = '/js/views';
            var tmpl_url = tmpl_dir + '/' + tmpl_name + '.html';

            var tmpl_string;
            $.ajax({
                url: tmpl_url,
                method: 'GET',
                async: false,
                success: function(data) {
                    tmpl_string = data;
                }
            });

            template_cache.tmpl_cache[tmpl_name] = _.template(tmpl_string);
        }

        return template_cache.tmpl_cache[tmpl_name](tmpl_data);
    }
    
    app.BudgetColl = Backbone.Collection.extend({
        startYear: 1995,
        endYear: 2012,
        updateYear: function(year, yearIndex){
            var exp = this.mainChartData.expenditures;
            var approp = this.mainChartData.appropriations;
            this.mainChartData.selectedExp = exp[yearIndex];
            this.mainChartData.selectedApprop = approp[yearIndex];
            this.mainChartData.viewYear = year;
            // this.mainChartData.chart.destroy();
            this.breakdownChartData = {rows:[]};
            var self = this;
            $.each(this.funds, function(i, fund){
                self.breakdownChartData.rows.push(self.getFundSummary(fund, year));
            });
            this.breakdownView.undelegateEvents();
            this.mainChartView.undelegateEvents();
            this.mainChartView = new app.MainChartView({
                model: this.mainChartData
            });
            this.breakdownView = new app.BreakdownView({
                model: this.breakdownChartData
            });
        },
        bootstrap: function(data){
            this.reset(data);
            this.funds = this.pluck('Fund ID').getUnique();
            this.depts = this.pluck('Department ID').getUnique();
            var self = this;
            var exp = [];
            var approp = [];
            $.each(this.getYearRange(), function(i, year){
                exp.push(self.getTotals('Expenditures', year));
                approp.push(self.getTotals('Appropriations', year));
            });
            this.mainChartData = {
                expenditures: exp,
                appropriations: approp,
                title: "Macoupin County, IL Budget",
                viewYear: this.endYear,
                selectedExp: exp[exp.length - 1],
                selectedApprop: approp[approp.length - 1]
            };
            this.breakdownChartData = {rows:[]};
            $.each(this.funds, function(i, fund){
                self.breakdownChartData.rows.push(self.getFundSummary(fund));
            });
            this.mainChartView = new app.MainChartView({
                model: this.mainChartData
            });
            this.breakdownView = new app.BreakdownView({
                model: this.breakdownChartData
            });
        },
        // Returns an array of valid years.
        getYearRange: function(){
            return Number.range(this.startYear, this.endYear + 1);
        },
        reduceTotals: function(totals){
            var total = [];
            totals.forEach(function(item){
                total.push(accounting.unformat(item));
            });
            return total.reduce(function(a,b){return a + b});
        },

        // Returns a total for a given category and year
        // Example: "Expenditures 1995"
        getTotals: function(category, year){
            var all = this.pluck(category + ' ' + year);
            return this.reduceTotals(all);
        },
        getFundTotals: function(category, fund, year){
            var totals = [];
            var rows = this.where({'Fund ID': fund});
            var self = this;
            rows.forEach(function(row){
                totals.push(accounting.unformat(row.get(category + ' ' + year)));
            });
            return totals;
        },
        getFundSummary: function(fund, year){
            if (typeof year === 'undefined'){
                year = this.endYear;
            }
            var funds = this.where({'Fund ID': fund});
            var summary = {};
            var self = this;
            var exp = self.getFundTotals('Expenditures', fund, year);
            var approp = self.getFundTotals('Appropriations', fund, year);
            var self = this;
            funds.forEach(function(item){
                summary['rowName'] = item.get('Fund');
                summary['description'] = item.get('Fund Description');
                summary['expenditures'] = self.reduceTotals(exp);
                summary['appropriations'] = self.reduceTotals(approp);
                summary['rowId'] = item.get('Fund ID');
                summary['type'] = 'Fund'
            });
            return summary;
        },
    });
    
    app.MainChartView = Backbone.View.extend({
        el: $('#main-chart'),

        // The bulk of the chart options are defined in the budget_highcharts.js file
        // and attached to the window over there. Dunno if that's the best approach but it works
        chartOpts: window.mainChartOpts,

        // Render the view when you initialize it.
        initialize: function(){
            this.render();
        },

        // This is where the magic happens. Grab the template from the template_cache function
        // at the top of this file and then update the chart with what's passed in as the model.
        render: function(){
            this.$el.html(template_cache('mainChart', this.model));
            this.updateChart(this.model, this.model.viewYear);
            return this;
        },
        updateChart: function(data, year){
            var minValuesArray = $.grep(data.appropriations.concat(data.expenditures),
              function(val) { return val != null; });
            var globalOpts = app.GlobalChartOpts;
            this.chartOpts.plotOptions.area.pointInterval = globalOpts.pointInterval;
            this.chartOpts.plotOptions.area.pointStart = Date.UTC(collection.startYear, 1, 1);
            this.chartOpts.plotOptions.series.point.events.click = this.pointClick;
            this.chartOpts.series = [{
                color: globalOpts.apropColor,
                data: data.appropriations,
                marker: {
                    radius: 6,
                    symbol: globalOpts.apropSymbol
                },
                name: globalOpts.apropTitle
              }, {
                color: globalOpts.expendColor,
                data: data.expenditures,
                marker: {
                    radius: 6,
                    symbol: globalOpts.expendSybmol
                },
                name: globalOpts.expendTitle
            }];
            this.chartOpts.yAxis.min = Math.min.apply( Math, minValuesArray )
            // select current year
            // var selectedYearIndex = year - collection.startYear;
            // if (this.chartOpts.series[0].data[selectedYearIndex].y != null)
            //   this.chartOpts.series[0].data[selectedYearIndex].select(true,true);
            // if (this.chartOpts.series[1].data[selectedYearIndex].y != null)
            //   this.chartOpts.series[1].data[selectedYearIndex].select(true,true);
            new Highcharts.Chart(this.chartOpts);
        },
        // This is the event handler for click events for the points in the chart.
        // TODO: Make it do something.
        pointClick: function(e){
            $("#readme").fadeOut("fast");
            $.cookie("budgetbreakdownreadme", "read", { expires: 7 });
            var x = this.x,
            y = this.y;//,
            // selected = !this.selected,
            // index = this.series.index;
            // this.select(selected, false);
            // 
            // $.each(this.series.chart.series, function(i, serie) {
            //   if (serie.index !== index) {
            //     $(serie.data).each(function(j, point){
            //       if(x === point.x && point.y != null) {
            //         point.select(selected, true);
            //       }
            //     });
            //   }
            // });
            var clickedYear = new Date(x).getFullYear();
            var yearIndex = this.series.processedYData.indexOf(y);
            collection.updateYear(clickedYear, yearIndex);
        }
    })

    // Breakdown Chart view. Does a lot the same kind of things as the main chart view
    app.BreakdownView = Backbone.View.extend({
        el: $('#breakdown'),

        // Bound to the window from the budget_highcharts.js file (as above)
        chartOpts: window.sparkLineOpts,
        
        // What to do with click events. So, when someone clicks on something
        // with a class of ".details", have the "details" method handle the event, etc
        events: {
            'click .details': 'details',
            'click .breakdown': 'breakdownNav'
        },

        // Render the view when you initialize it
        initialize: function(){
            this.render();
        },

        // Grab the template from the template cache, bind the model to it and render it
        render: function(){
            this.$el.html(template_cache('breakdownTable', this.model));
            return this;
        },

        // Gets fired when a user clicks the links to view the detail charts
        details: function(e){
            e.preventDefault();
            var row = $(e.currentTarget).parent().parent();
            $.each(row.parent().find('img'), function(i,img){
                $(img).attr('src', 'images/expand.png');
            })
            var fundId = row.attr('id');
            this.model.fundId = fundId;
            // The "model" here is a summary of the collection that gets passed in to the
            // view when the view is initialized. This makes it so we don't have to
            // re iterate the collection every time we want to summarize.
            var expenditures = [];
            var appropriations = [];
            var self = this
            $.each(collection.getYearRange(), function(i, year){
                var exp = collection.getFundTotals('Expenditures', fundId, year)
                expenditures.push(collection.reduceTotals(exp));
                var approp = collection.getFundTotals('Appropriations', fundId, year);
                appropriations.push(collection.reduceTotals(approp));
            });
            this.model.allExpenditures = expenditures;
            this.model.allAppropriations = appropriations;
            // Update the detail chart.
            this.updateChart();
            if(row.next().is(':visible')){
                row.next().hide();
                row.find('img').attr('src', 'images/expand.png')
            } else {
                row.next().show();
                row.find('img').attr('src', 'images/collapse.png')
            }
        },

        // This gets fired when a user clicks the "breakdown" link in the detail
        // Triggers the router to update the URL and fires the appropriate function
        breakdownNav: function(e){
            // START HERE FIGURE OUT EVENT HANDLING
            var slug = $(e.target).data('slug');
            var model_id = $(e.target).data('obj-id');
            // app_router.navigate('drilldown/' + type + '/' + slug, {trigger: true});
        },

        // Updates the detail chart in a lot the same way as the main chart one
        updateChart: function(){
            var data = this.model;
            var minValuesArray = $.grep(data.allAppropriations.concat(data.allExpenditures),
              function(val) { return val != null; });
            var globalOpts = app.GlobalChartOpts;
            this.chartOpts.chart.renderTo = data.fundId + "-selected-chart";
            this.chartOpts.plotOptions.area.pointInterval = globalOpts.pointInterval
            this.chartOpts.plotOptions.area.pointStart = Date.UTC(collection.startYear, 1, 1)
            this.chartOpts.yAxis.min = Math.min.apply( Math, minValuesArray )
            this.chartOpts.plotOptions.series.point.events.click = this.pointClick;
            this.chartOpts.series = [{
                color: globalOpts.apropColor,
                data: data.allAppropriations,
                marker: {
                  radius: 4,
                  symbol: globalOpts.apropSymbol
                },
                name: globalOpts.apropTitle
              }, {
                color: globalOpts.expendColor,
                data: data.allExpenditures,
                marker: {
                  radius: 5,
                  symbol: globalOpts.expendSybmol
                },
                name: globalOpts.expendTitle
              }]
            // select current year
            // var selectedYearIndex = 2012 - collection.startYear;
            // if (this.chartOpts.series[0].data[selectedYearIndex].y != null)
            //   this.chartOpts.series[0].data[selectedYearIndex].select(true,true);
            // if (this.chartOpts.series[1].data[selectedYearIndex].y != null)
            //   this.chartOpts.series[1].data[selectedYearIndex].select(true,true);
            new Highcharts.Chart(this.chartOpts);
        },

        // Handler for the click events on the points on the chart
        // TODO: make it do something
        pointClick: function(e){
            $("#readme").fadeOut("fast");
            $.cookie("budgetbreakdownreadme", "read", { expires: 7 });
            var x = this.x,
            y = this.y,
            selected = !this.selected,
            index = this.series.index;
            this.select(selected, false);

            $.each(this.series.chart.series, function(i, serie) {
              if (serie.index !== index) {
                $(serie.data).each(function(j, point){
                  if(x === point.x && point.y != null) {
                    point.select(selected, true);
                  }
                });
              }
            });
            var clickedYear = new Date(x).getFullYear();
            var yearIndex = this.series.processedYData.indexOf(y);
            collection.updateYear(clickedYear, yearIndex);
            // hack to prevent chart from re-loading while updating the url
            // app_router.navigate((BudgetLib.viewMode + '/' + BudgetLib.viewName + '/' + clickedYear + '/' + BudgetLib.viewChart), {trigger: false});
            // BudgetLib.updateView(BudgetLib.viewMode, BudgetLib.viewName, clickedYear, BudgetLib.viewChart, false);
        }
    });

    app.GlobalChartOpts = {
        pointInterval: 365 * 24 * 3600 * 1000, //one year in ms
        apropColor:   '#13345a',
        apropSymbol:  'circle',
        apropTitle:   'Appropriations',
        expendColor:  '#405c7d',
        expendSybmol: 'square',
        expendTitle:  'Expenditures',
    }
    
    app.Router = Backbone.Router.extend({
        routes: {
            "*actions": "defaultRoute"
        },
        initialize: function(options){
            this.collection = options.collection;
        },
        defaultRoute: function(actions){
            var self = this;
            $.when($.get('/data/macoupin_budget_cleaned.csv')).then(
                function(data){
                    var json = $.csv.toObjects(data);
                    self.collection.bootstrap(json);
                }
            )
        }
    });
    var collection = new app.BudgetColl();
    var app_router = new app.Router({collection: collection});
    Backbone.history.start();
})()