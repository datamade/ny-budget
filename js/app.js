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
    
    app.MainChartModel = Backbone.Model.extend({
        setYear: function(year, index){
            var exp = this.get('expenditures');
            var approp = this.get('appropriations');
            this.set({
                'selectedExp': accounting.formatMoney(exp[index]),
                'selectedApprop': accounting.formatMoney(approp[index]),
                'viewYear': year
            });
        }
    });
    
    app.BreakdownRow = Backbone.Model.extend({})
    
    app.BreakdownModel = Backbone.Collection.extend({
        setRows: function(year){
            var self = this;
            this.models.forEach(function(row){
                row.set(collection.getFundSummary(row.get('rowId'), year))
            });
        }
    });
    
    app.BudgetColl = Backbone.Collection.extend({
        startYear: 1995,
        endYear: 2012,
        updateYear: function(year, yearIndex){
            this.mainChartData.setYear(year, yearIndex);
            this.breakdownChartData.setRows(year);
        },
        bootstrap: function(){
            var self = this;
            $.when($.get('/data/macoupin_budget_cleaned.csv')).then(
                function(data){
                    var json = $.csv.toObjects(data);
                    self.add(json);
                    self.funds = self.pluck('Fund ID').getUnique();
                    self.depts = self.pluck('Department ID').getUnique();
                    var inner_self = self;
                    var exp = [];
                    var approp = [];
                    $.each(self.getYearRange(), function(i, year){
                        exp.push(self.getTotals('Expenditures', year));
                        approp.push(self.getTotals('Appropriations', year));
                    });
                    self.mainChartData = new app.MainChartModel({
                        expenditures: exp,
                        appropriations: approp,
                        title: "Macoupin County, IL Budget",
                        viewYear: self.endYear,
                        selectedExp: accounting.formatMoney(exp[exp.length - 1]),
                        selectedApprop: accounting.formatMoney(approp[approp.length - 1])
                    });
                    self.mainChartData.parent = this;
                    var bd = []
                    $.each(self.funds, function(i, fund){
                        var row = new app.BreakdownRow(self.getFundSummary(fund));
                        bd.push(row);
                        var rowView = new app.BreakdownSummary({model:row});
                        $('#breakdown-table-body').append(rowView.render().el);
                    });
                    self.breakdownChartData = new app.BreakdownModel(bd);
                    self.breakdownChartData.parent = this;
                    self.mainChartView = new app.MainChartView({
                        model: self.mainChartData
                    });
                    // self.breakdownView = new app.BreakdownView({
                    //     model: self.breakdownChartData
                    // });
                }
            );
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
                summary['slug'] = BudgetHelpers.convertToSlug(item.get('Fund'))
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
            // this.listenTo(this.model, 'change', this.renderUpdate);
            this._modelBinder = new Backbone.ModelBinder();
            this.render();
        },

        // This is where the magic happens. Grab the template from the template_cache function
        // at the top of this file and then update the chart with what's passed in as the model.
        render: function(){
            this.$el.html(template_cache('mainChart', {model: this.model}));
            this._modelBinder.bind(this.model, this.el, {
                viewYear: '#secondary-title .viewYear',
                selectedExp: '.expenditures',
                selectedApprop: '.appropriations'
            });
            this.updateChart(this.model, this.model.viewYear);
            return this;
        },
        updateChart: function(data, year){
            var exp = jQuery.extend(true, [], data.get('expenditures'));
            var approp = jQuery.extend(true, [], data.get('appropriations'));
            var minValuesArray = $.grep(approp.concat(exp),
              function(val) { return val != null; });
            var globalOpts = app.GlobalChartOpts;
            this.chartOpts.plotOptions.area.pointInterval = globalOpts.pointInterval;
            this.chartOpts.plotOptions.area.pointStart = Date.UTC(collection.startYear, 1, 1);
            this.chartOpts.plotOptions.series.point.events.click = this.pointClick;
            this.chartOpts.series = [{
                color: globalOpts.apropColor,
                data: approp,
                marker: {
                    radius: 6,
                    symbol: globalOpts.apropSymbol
                },
                name: globalOpts.apropTitle
              }, {
                color: globalOpts.expendColor,
                data: exp,
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
        }
    })

    // Breakdown Chart view. Does a lot the same kind of things as the main chart view
    app.BreakdownSummary = Backbone.View.extend({
        tagName: 'tr',
        className: 'rowId',
        detailShowing: false,
        events: {
            'click .details': 'details'
        },
        initialize: function(){
            this._modelBinder = new Backbone.ModelBinder();
        },
        render: function(){
            this.$el.html(template_cache('breakdownSummary', {model:this.model}));
            this._modelBinder.bind(this.model, this.el, {
                expenditures: {selector: '[name="expenditures"]', converter: this.moneyChanger},
                appropriations: {selector: '[name="appropriations"]', converter: this.moneyChanger} 
            });
            return this;
        },
        moneyChanger: function(direction, value){
            return accounting.formatMoney(value);
        },
        details: function(e){
            e.preventDefault();
            if (this.detailShowing){
                this.$el.next().remove();
                this.$el.find('img').attr('src', 'images/expand.png')
                this.detailShowing = false;
            } else {
                var row = $(e.currentTarget).parent().parent();
                $.each(row.parent().find('img'), function(i,img){
                    $(img).attr('src', 'images/expand.png');
                })
                var fundId = this.model.get('rowId');
                var expenditures = [];
                var appropriations = [];
                $.each(collection.getYearRange(), function(i, year){
                    var exp = collection.getFundTotals('Expenditures', fundId, year)
                    expenditures.push(collection.reduceTotals(exp));
                    var approp = collection.getFundTotals('Appropriations', fundId, year);
                    appropriations.push(collection.reduceTotals(approp));
                });
                this.model.allExpenditures = expenditures;
                this.model.allAppropriations = appropriations;
                var detailView = new app.BreakdownDetail({model:this.model});
                detailView.render().$el.insertAfter(this.$el);
                detailView.updateChart();
                this.detailShowing = true;
                this.$el.find('img').attr('src', 'images/collapse.png')
            }
        },
    })

    app.BreakdownDetail = Backbone.View.extend({
        tagName: 'tr',
        className: 'expanded-content',
        chartOpts: window.sparkLineOpts,
        
        // What to do with click events. So, when someone clicks on something
        // with a class of ".details", have the "details" method handle the event, etc
        events: {
            'click .breakdown': 'breakdownNav'
        },

        // Grab the template from the template cache, bind the model to it and render it
        render: function(){
            this.$el.html(template_cache('breakdownDetail', {model: this.model}));
            return this;
        },

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
            this.chartOpts.chart.renderTo = data.get('rowId') + "-selected-chart";
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
            self.collection.bootstrap();
        }
    });
    var collection = new app.BudgetColl();
    var app_router = new app.Router({collection: collection});
    Backbone.history.start();
})()