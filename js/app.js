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
            ":mode/:name/:year(/:viewChart)": "routeView",
            "*actions": "defaultRoute"
        }
    });

    app.BudgetModel = Backbone.Model.extend({});

    app.BudgetColl = Backbone.Collection.extend({
        model: app.BudgetModel,
        startYear: 1995,
        endYear: 2012,
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
            var dept = this.where({'Fund ID': fund});
            var summary = {};
            var self = this;
            var exp = self.getFundTotals('Expenditures', fund, year);
            var approp = self.getFundTotals('Appropriations', fund, year);
            var self = this;
            dept.forEach(function(item){
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
        }
    });

    app.MainChartView = Backbone.View.extend({
        el: $('#main-chart'),
        initialize: function(){
            this.render();
        },
        render: function(){
            this.$el.html(template_cache('mainChart', this.model))
            BudgetHighcharts.updateMainChart(this.model);
            return this;
        },
    })

     app.BreakdownView = Backbone.View.extend({
        el: $('#breakdown'),
        initialize: function(){
            this.render();
        },
        events: {
            'click .fund-details': 'fundDetails'
        },
        render: function(){
            this.$el.html(template_cache('breakdownTable', this.model));
            return this;
        },
        fundDetails: function(e){
            $('.expanded-content').hide();
            var row = $(e.currentTarget).parent().parent();
            $.each(row.parent().find('img'), function(i,img){
                $(img).attr('src', 'images/expand.png');
            })
            var fundId = row.attr('id');
            var data = {
                expenditures: [],
                appropriations: [],
                rowId: fundId
            }
            $.each(collection.getYearRange(), function(i, year){
                var exp = collection.getFundTotals('Expenditures', fundId, year)
                data.expenditures.push(collection.reduceTotals(exp));
                var approp = collection.getFundTotals('Appropriations', fundId, year);
                data.appropriations.push(collection.reduceTotals(approp));
            });
            BudgetHighcharts.updateSparkline(data);
            console.log(row.next().is(':visible'))
            if(row.next().is(':visible')){
                row.next().hide();
                row.find('img').attr('src', 'images/expand.png')
            } else {
                row.next().show();
                row.find('img').attr('src', 'images/collapse.png')
            }
        }
    });

    var app_router = new app.AppRouter;
    var collection = new app.BudgetColl();
    app_router.on('route:defaultRoute', function (actions) {
        d3.csv('data/macoupin_budget_cleaned.csv', function(rows){
            collection.add(rows);
            var main_chart_data = {
                expenditures: [],
                appropriations: [],
                title: "Macoupin County, IL Budget",
                viewMode: "home",
                subtype: "Description",
                viewYear: 2012,
            };
            var breakdown_data = {rows: []};
            var funds = collection.getFunds();
            $.each(collection.getYearRange(), function(i, year){
                var exp = collection.getTotals('Expenditures', year);
                main_chart_data.expenditures.push(exp);
                var approp = collection.getTotals('Appropriations', year);
                main_chart_data.appropriations.push(approp);
            });
            $.each(collection.getFunds(), function(i, fund){
                breakdown_data['rows'].push(collection.getFundSummary(fund))
            });
            var main_chart = new app.MainChartView({
                model: main_chart_data
            });
            var breakdown_table = new app.BreakdownView({
                model:breakdown_data
            });
        });
      //var summaries = [];
      //BudgetLib.getDataAsBudgetTable(summaries);
      //})
    });


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
