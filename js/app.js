(function(){
    var app = {}

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

    // Backbone app routing

    // main application handler
    app.AppRouter = Backbone.Router.extend({
        routes: {
            "search/:query": "routeSearch",
            "fund/:slug(/:year)": "fundBreakdown",
            "*actions": "defaultRoute"
        }
    });

    app.BudgetModel = Backbone.Model.extend({});

    app.BudgetColl = Backbone.Collection.extend({
        model: app.BudgetModel,
        startYear: 1995,
        endYear: 2012,
        mainChartData: {},
        breakdownChartData: {},
        initialize: function(models, options){
            var self = this;
        },
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
            });
            return summary;
        },
        getFunds: function(){
            return this.pluck('Fund ID').getUnique();
        },
        getDeptTotals: function(category, dept, year){
            var totals = [];
            var rows = this.where({'Department ID': String(dept)});
            rows.forEach(function(row){
                totals.push(accounting.unformat(row.get(category + ' ' + year)));
            });
            return totals;
        },
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
        getDepartments: function(fund){
            var depts = this.where({'Fund': fund});
            var all_depts = [];
            depts.forEach(function(dept){
                all_depts.push(dept.get('Department ID'))
            });
            return all_depts.getUnique();
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

    app.MainChartView = Backbone.View.extend({
        el: $('#main-chart'),
        chartOpts: window.mainChartOpts,
        initialize: function(){
            this.render();
        },
        render: function(){
            this.$el.html(template_cache('mainChart', this.model))
            this.updateChart(this.model, 2012);
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
            var selectedYearIndex = year - collection.startYear;
            if (this.chartOpts.series[0].data[selectedYearIndex].y != null)
              this.chartOpts.series[0].data[selectedYearIndex].select(true,true);
            if (this.chartOpts.series[1].data[selectedYearIndex].y != null)
              this.chartOpts.series[1].data[selectedYearIndex].select(true,true);
            new Highcharts.Chart(this.chartOpts);
        },
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
            console.log(clickedYear);
            // hack to prevent chart from re-loading while updating the url
            // app_router.navigate((BudgetLib.viewMode + '/' + BudgetLib.viewName + '/' + clickedYear + '/' + BudgetLib.viewChart), {trigger: false});
            // BudgetLib.updateView(BudgetLib.viewMode, BudgetLib.viewName, clickedYear, BudgetLib.viewChart, false);
        }
    })

     app.BreakdownView = Backbone.View.extend({
        el: $('#breakdown'),
        chartOpts: window.sparkLineOpts,
        initialize: function(){
            this.render();
        },
        events: {
            'click .details': 'details',
            'click .breakdown': 'breakdownNav'
        },
        render: function(){
            this.$el.html(template_cache('breakdownTable', this.model));
            return this;
        },
        details: function(e){
            e.preventDefault();
            var row = $(e.currentTarget).parent().parent();
            $.each(row.parent().find('img'), function(i,img){
                $(img).attr('src', 'images/expand.png');
            })
            var fundId = row.attr('id');
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
            this.updateChart(this.model)
            if(row.next().is(':visible')){
                row.next().hide();
                row.find('img').attr('src', 'images/expand.png')
            } else {
                row.next().show();
                row.find('img').attr('src', 'images/collapse.png')
            }
        },
        breakdownNav: function(e){
            var slug = $(e.target).data('slug');
            var type = $(e.target).data('type');
            app_router.navigate('fund/' + type + '/' + slug, {trigger: true});
        },
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
            console.log(clickedYear);
            // hack to prevent chart from re-loading while updating the url
            // app_router.navigate((BudgetLib.viewMode + '/' + BudgetLib.viewName + '/' + clickedYear + '/' + BudgetLib.viewChart), {trigger: false});
            // BudgetLib.updateView(BudgetLib.viewMode, BudgetLib.viewName, clickedYear, BudgetLib.viewChart, false);
        }
    });

    var app_router = new app.AppRouter;
    var collection = new app.BudgetColl();
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

    app_router.on('route:fundBreakdown', function(type, slug, year){
        // TODO: Make sure that data is available when visiting the
        // path directly.
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

    // Instantiate the router
    //  app_router.on('route:routeSearch', function (query) {
    //      BudgetLib.renderSearch(query);
    //  });
    //  app_router.on('route:routeView', function (mode, name, year, viewChart) {
    //      BudgetLib.updateView(mode, name, year, viewChart, true);
    //  });
    //
    //  // Start Backbone history a necessary step for bookmarkable URL's
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
