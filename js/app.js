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

    // Define routes. Only the "fund/:slug" and "*actions" are in use right now
    app.AppRouter = Backbone.Router.extend({
        routes: {
            "search/:query": "routeSearch",
            "drilldown/:slug(/:year)": "drillDown",
            "year/:year": "yearDetail",
            "*actions": "defaultRoute"
        }
    });

    // Give the collection a model to render. Not entirely necessary but stubbing it
    // out so that we can define model methods but who knows.
    app.BudgetModel = Backbone.Model.extend({});

    // Main collection.
    app.BudgetColl = Backbone.Collection.extend({
        // Setup defaults
        model: app.BudgetModel,
        startYear: 1995,
        endYear: 2012,

        // Placeholders for summarized versions of data that gets rendered into charts
        mainChartData: {},
        breakdownChartData: {},

        // Returns an array of valid years.
        getYearRange: function(){
            return Number.range(this.startYear, this.endYear + 1);
        },

        // Returns the sum of an array
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

        // Returns an array of totals for a given fund. Used by the summary method below
        getFundTotals: function(category, fund, year){
            var totals = [];
            var rows = this.where({'Fund ID': fund});
            var self = this;
            rows.forEach(function(row){
                totals.push(accounting.unformat(row.get(category + ' ' + year)));
            });
            return totals;
        },

        // Returns a summary of funds that is used to render the breakdown table
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
            });
            return summary;
        },

        // Returns an array of all unique Fund IDs
        getFunds: function(){
            return this.pluck('Fund ID').getUnique();
        },

        // Pretty much the same as the getFundTotals.
        // TODO: These two should probably be combined cause they are pretty much the same.
        getDeptTotals: function(category, dept, year){
            var totals = [];
            var rows = this.where({'Department ID': String(dept)});
            rows.forEach(function(row){
                totals.push(accounting.unformat(row.get(category + ' ' + year)));
            });
            return totals;
        },

        // Pretty much the same as the getFundSummary but for departments.
        // TODO: Should probably come up with an abstraction for both since they are largely the same.
        getDeptSummary: function(dept_id, year){
            if (typeof year === 'undefined'){
                year = this.endYear;
            }
            var depts = this.where({'Department ID': String(dept_id)});
            var summary = {};
            var self = this;
            var exp = self.getDeptTotals('Expenditures', dept_id, year);
            var approp = self.getDeptTotals('Appropriations', dept_id, year);
            var self = this;
            depts.forEach(function(item){
                summary['rowName'] = item.get('Department');
                summary['description'] = item.get('Department Description');
                summary['expenditures'] = self.reduceTotals(exp);
                summary['appropriations'] = self.reduceTotals(approp);
                summary['rowId'] = item.get('Department ID');
            });
            return summary;
        },

        // Returns an array of unique Department IDs given a Fund.
        getDepartments: function(fund){
            var depts = this.where({'Fund': fund});
            var all_depts = [];
            depts.forEach(function(dept){
                all_depts.push(dept.get('Department ID'))
            });
            return all_depts.getUnique();
        }
    });

    // Common chart settings.
    app.GlobalChartOpts = {
        pointInterval: 365 * 24 * 3600 * 1000, //one year in ms
        apropColor:   '#13345a',
        apropSymbol:  'circle',
        apropTitle:   'Appropriations',
        expendColor:  '#405c7d',
        expendSybmol: 'square',
        expendTitle:  'Expenditures',
    }

    // Um, Main Chart View.
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
            this.$el.html(template_cache('mainChart', this.model))
            this.updateChart(this.model, 2012);
            return this;
        },

        // Append and customize the chart options for the given model passed into the view.
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
            var selectedYearIndex = year - collection.startYear;
            if (this.chartOpts.series[0].data[selectedYearIndex].y != null)
              this.chartOpts.series[0].data[selectedYearIndex].select(true,true);
            if (this.chartOpts.series[1].data[selectedYearIndex].y != null)
              this.chartOpts.series[1].data[selectedYearIndex].select(true,true);
            new Highcharts.Chart(this.chartOpts);
        },

        // This is the event handler for click events for the points in the chart.
        // TODO: Make it do something.
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
            var hash = window.location.hash.replace('#', '');
            if(hash){
                app_router.navigate(hash + '/' + clickedYear, {trigger: true});
            } else {
                app_router.navigate('year' + '/' + clickedYear, {trigger: true});
            }
            // hack to prevent chart from re-loading while updating the url
            // app_router.navigate((BudgetLib.viewMode + '/' + BudgetLib.viewName + '/' + clickedYear + '/' + BudgetLib.viewChart), {trigger: false});
            // BudgetLib.updateView(BudgetLib.viewMode, BudgetLib.viewName, clickedYear, BudgetLib.viewChart, false);
        }
    })

    // Breakdown Chart view. Does a lot the same kind of things as the main chart view
     app.BreakdownView = Backbone.View.extend({
        el: $('#breakdown'),

        // Bound to the window from the budget_highcharts.js file (as above)
        chartOpts: window.sparkLineOpts,

        // Render the view when you initialize it
        initialize: function(){
            this.render();
        },

        // What to do with click events. So, when someone clicks on something
        // with a class of ".details", have the "details" method handle the event, etc
        events: {
            'click .details': 'details',
            'click .breakdown': 'breakdownNav'
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

            // The "model" here is a summary of the collection that gets passed in to the
            // view when the view is initialized. This makes it so we don't have to
            // re iterate the collection every time we want to summarize.
            this.model.expenditures = [];
            this.model.appropriations = [];
            this.model.rowId = fundId;
            var self = this
            $.each(collection.getYearRange(), function(i, year){
                var exp = collection.getFundTotals('Expenditures', fundId, year)
                self.model.expenditures.push(collection.reduceTotals(exp));
                var approp = collection.getFundTotals('Appropriations', fundId, year);
                self.model.appropriations.push(collection.reduceTotals(approp));
            });

            // Update the detail chart.
            this.updateChart(this.model);
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
            var slug = $(e.target).data('slug');
            var type = $(e.target).data('type');
            app_router.navigate('drilldown/' + type + '/' + slug, {trigger: true});
        },

        // Updates the detail chart in a lot the same way as the main chart one
        updateChart: function(data){
            var minValuesArray = $.grep(data.appropriations.concat(data.expenditures),
              function(val) { return val != null; });
            var globalOpts = app.GlobalChartOpts;
            this.chartOpts.chart.renderTo = data.rowId + "-selected-chart";
            this.chartOpts.plotOptions.area.pointInterval = globalOpts.pointInterval
            this.chartOpts.plotOptions.area.pointStart = Date.UTC(collection.startYear, 1, 1)
            this.chartOpts.yAxis.min = Math.min.apply( Math, minValuesArray )
            this.chartOpts.plotOptions.series.point.events.click = this.pointClick;
            this.chartOpts.series = [{
                color: globalOpts.apropColor,
                data: data.appropriations,
                marker: {
                  radius: 4,
                  symbol: globalOpts.apropSymbol
                },
                name: globalOpts.apropTitle
              }, {
                color: globalOpts.expendColor,
                data: data.expenditures,
                marker: {
                  radius: 5,
                  symbol: globalOpts.expendSybmol
                },
                name: globalOpts.expendTitle
              }]
            // select current year
            var selectedYearIndex = 2012 - collection.startYear;
            if (this.chartOpts.series[0].data[selectedYearIndex].y != null)
              this.chartOpts.series[0].data[selectedYearIndex].select(true,true);
            if (this.chartOpts.series[1].data[selectedYearIndex].y != null)
              this.chartOpts.series[1].data[selectedYearIndex].select(true,true);
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
            // hack to prevent chart from re-loading while updating the url
            // app_router.navigate((BudgetLib.viewMode + '/' + BudgetLib.viewName + '/' + clickedYear + '/' + BudgetLib.viewChart), {trigger: false});
            // BudgetLib.updateView(BudgetLib.viewMode, BudgetLib.viewName, clickedYear, BudgetLib.viewChart, false);
        }
    });

    // Make the router
    var app_router = new app.AppRouter;

    // initialize the main collection
    var collection = new app.BudgetColl();

    // Default route. Loads the CSV file and populates the summarized "models" which get rendered
    // into the views. Those then get stashed as properties on the main collection so that we
    // don't have to recompute them
    app_router.on('route:defaultRoute', function (actions) {
        d3.csv('data/macoupin_budget_cleaned.csv', function(rows){
            collection.reset(rows);
            collection.mainChartData = {
                expenditures: [],
                appropriations: [],
                title: "Macoupin County, IL Budget",
                viewYear: collection.endYear,
            };
            collection.breakdownChartData = {rows: [], type:'Fund'};
            $.each(collection.getYearRange(), function(i, year){
                var exp = collection.getTotals('Expenditures', year);
                collection.mainChartData.expenditures.push(exp);
                var approp = collection.getTotals('Appropriations', year);
                collection.mainChartData.appropriations.push(approp);
            });
            $.each(collection.getFunds(), function(i, fund){
                collection.breakdownChartData['rows'].push(collection.getFundSummary(fund))
            });
            var main_chart = new app.MainChartView({
                model: collection.mainChartData
            });
            var breakdown_table = new app.BreakdownView({
                model: collection.breakdownChartData
            });
        });
    });

    app_router.on('router:yearDetail', function(year){
        console.log(year);
    })

    // This is for the fund breakdown. Works a lot the same as above
    // but fetches the summary versions of the data so they don't
    // need to be recomputed.
    // TODO: One issue is that if you visit a route directly, the collection
    // has not been populated yet. So, we need to check and load if necessary
    // I suppose.
    app_router.on('route:drillDown', function(type, slug, year){
        var name = slug.split('-').join(' ');
        if (!year){
            year = 2012
        }
        collection.mainChartData['expenditures'] = collection.breakdownChartData['expenditures'];
        collection.mainChartData['appropriations'] = collection.breakdownChartData['appropriations'];
        collection.mainChartData['title'] = name;
        collection.breakdownChartData = {rows: [], type:'Fund'};
        $.each(collection.getDepartments(name), function(dept){
            collection.breakdownChartData['rows'].push(collection.getDeptSummary(dept));
        });
        $('#main-chart').empty();
        $('#breakdown').empty();
        var main_chart = new app.MainChartView({
            model: collection.mainChartData
        });
        var breakdown_table = new app.BreakdownView({
            model: collection.breakdownChartData
        });
    })

    // Start Backbone history a necessary step for bookmarkable URL's
    Backbone.history.start();

    //cookies for first time visitors
    $("body").bind("click", function(e){
      $.cookie("budgetbreakdownreadme", "read", { expires: 7 });
      $("#readme").fadeOut("fast");
    });

    if ($.cookie("budgetbreakdownreadme") != "read") {
      $("#readme").fadeIn("fast");
    }

    // Firing events for search
    $("#search-query").keydown(function(e){
      var key =  e.keyCode ? e.keyCode : e.which;
      if(key == 13) {
          $('#search').click();
          return false;
      }
    });

    $('#search').click(function(){
      var query = $('#search-query').val();
      app_router.navigate("search/" + query, {trigger: false});
      BudgetLib.renderSearch(query);
      return false;
    });
})()
