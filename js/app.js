(function(){
    var app = {}

    // Builds a cache of templates that get fetched and rendered by views
    function template_cache(tmpl_name, tmpl_data){
        if ( !template_cache.tmpl_cache ) {
            template_cache.tmpl_cache = {};
        }

        if ( ! template_cache.tmpl_cache[tmpl_name] ) {
            var tmpl_dir = '/js/views';
            var tmpl_url = tmpl_dir + '/' + tmpl_name + '.html?3';

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

    function calc_change(cur, prev){
        if (prev == 0){
            return null
        }
        if (cur == 0 && prev == 0){
            return null
        }
        var change = parseFloat(((cur - prev) / prev) * 100);
        if (change < 0){
            change = change.toFixed(1) + '%';
        } else {
            change = '+' + change.toFixed(1) + '%';
        }
        return change
    }

    app.MainChartModel = Backbone.Model.extend({
        setYear: function(year, index){
            var exp = this.get('expenditures');
            var approp = this.get('appropriations');
            var expChange = calc_change(exp[index], exp[index -1]);
            var appropChange = calc_change(approp[index], approp[index - 1]);
            this.set({
                'selectedExp': accounting.formatMoney(exp[index]),
                'selectedApprop': accounting.formatMoney(approp[index]),
                'expChange': expChange,
                'appropChange': appropChange,
                'viewYear': year,
                'prevYear': year - 1
            });
        }
    });

    app.BreakdownRow = Backbone.Model.extend({
        yearIndex: null
    });

    app.BreakdownColl = Backbone.Collection.extend({
        setRows: function(year, index){
            var self = this;
            this.models.forEach(function(row){
                var query = {}
                query[row.get('type')] = row.get('rowName')
                var summ = collection.getSummary(row.get('type'), query, year)
                row.set(summ);
                row.yearIndex = index;
            });
        }
    });

    app.BudgetColl = Backbone.Collection.extend({
        startYear: 1995,
        endYear: 2012,
        updateYear: function(year, yearIndex){
            this.mainChartData.setYear(year, yearIndex);
            this.breakdownChartData.setRows(year, yearIndex);
        },
        updateTables: function(view, title, filter){
            // Various cleanup is needed when running this a second time.
            if(typeof this.mainChartView !== 'undefined'){
                this.mainChartView.undelegateEvents();
            }
            if($('#breakdown-table-body').html() != ''){
                $('#breakdown-table-body').empty();
            }
            if(typeof this.dataTable !== 'undefined'){
                this.dataTable.fnClearTable();
                this.dataTable.fnDestroy();
            }
            // Need to orientate the views to a top level
            if(typeof this.hierarchy[view] !== 'undefined'){
                this.topLevelView = view
            }
            var exp = [];
            var approp = [];
            var self = this;
            var values = this.toJSON();
            var incomingFilter = false;
            if (typeof filter !== 'undefined'){
                values = _.where(this.toJSON(), filter);
                incomingFilter = true;
            }
            $.each(this.getYearRange(), function(i, year){
                exp.push(self.getTotals(values, 'Expenditures', year));
                approp.push(self.getTotals(values, 'Appropriations', year));
            });
            var selExp = exp[exp.length - 1];
            var prevExp = exp[exp.length - 2];
            var expChange = calc_change(selExp, prevExp);
            var selApprop = approp[approp.length - 1];
            var prevApprop = approp[approp.length - 2];
            var appropChange = calc_change(selApprop, prevApprop);
            this.mainChartData = new app.MainChartModel({
                expenditures: exp,
                appropriations: approp,
                title: title,
                viewYear: self.endYear,
                prevYear: self.endYear - 1,
                selectedExp: accounting.formatMoney(selExp),
                selectedApprop: accounting.formatMoney(selApprop),
                appropChange: appropChange,
                expChange: expChange,
                view: self.topLevelView
            });
            var bd = []
            var chartGuts = this.pluck(view).getUnique();
            var all_nums = []
            $.each(chartGuts, function(i, name){
                if (!incomingFilter){
                    filter = {}
                }
                filter[view] = name;
                var summary = self.getSummary(view, filter);
                if (summary){
                    var row = new app.BreakdownRow(summary);
                    bd.push(row);
                    all_nums.push(summary['expenditures']);
                    all_nums.push(summary['appropriations']);
                }
            });
            var maxNum = all_nums.sort(function(a,b){return b-a})[0];
            this.breakdownChartData = new app.BreakdownColl(bd);
            this.breakdownChartData.forEach(function(row){
                var rowView = new app.BreakdownSummary({model:row, attributes: {maxNum: maxNum}});
                $('#breakdown-table-body').append(rowView.render().el);
            });
            this.mainChartView = new app.MainChartView({
                model: self.mainChartData
            });
            this.dataTable = $("#breakdown").dataTable({
                "aaSorting": [[1, "desc"]],
                "aoColumns": [
                    null,
                    {'sType': 'currency'},
                    {'sType': 'currency'},
                    null
                ],
                "bFilter": false,
                "bInfo": false,
                "bPaginate": false,
                "bRetrieve": true,
                "bAutoWidth": false
            });
        },
        bootstrap: function(init){
            var self = this;
            this.spin('#main-chart', 'large');
            $.when($.get('/data/macoupin-budget-2014-cleaned.csv')).then(
                function(data){
                    var json = $.csv.toObjects(data);
                    self.reset(json);
                    self.hierarchy = {
                        Fund: ['Fund', 'Department', 'Expense Line'],
                        "Control Officer": ['Control Officer', 'Department', 'Expense Line']
                    }
                    if (typeof init === 'undefined'){
                        self.topLevelView = 'Fund';
                        self.updateTables('Fund', 'Macoupin County budget');
                    } else {
                        var topLevelView = init[0];
                        var name = init[1];
                        var filter = {}
                        filter[topLevelView] = name;
                        if(init.length > 2){
                            name = init[2].split('-').join(' ');
                            filter['Department'] = name;
                        }
                        self.updateTables(topLevelView, name, filter);
                    }
                }
            );
        },
        spin: function(element, option){
            // option is either size of spinner or false to cancel it
            $(element).spin(option);
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
        getTotals: function(values, category, year){
            var all = _.pluck(values, category + ' ' + year);
            return this.reduceTotals(all);
        },
        getChartTotals: function(category, query, year){
            var totals = [];
            var rows = this.where(query);
            var self = this;
            rows.forEach(function(row){
                totals.push(accounting.unformat(row.get(category + ' ' + year)));
            });
            return totals;
        },
        getSummary: function(view, query, year){
            if (typeof year === 'undefined'){
                year = this.endYear;
            }
            var guts = this.where(query);
            if (guts.length < 1) {
                return null;
            }
            var summary = {};
            var self = this;
            var exp = self.getChartTotals('Expenditures', query, year);
            var approp = self.getChartTotals('Appropriations', query, year);
            var prevExp = self.getChartTotals('Expenditures', query, year - 1);
            var prevApprop = self.getChartTotals('Appropriations', query, year - 1);
            var expChange = calc_change(self.reduceTotals(exp), self.reduceTotals(prevExp));
            var appropChange = calc_change(self.reduceTotals(approp), self.reduceTotals(prevApprop));
            var self = this;
            guts.forEach(function(item){
                summary['rowName'] = item.get(view);
                summary['prevYear'] = year - 1;
                summary['description'] = item.get(view + ' Description');
                summary['expenditures'] = self.reduceTotals(exp);
                summary['appropriations'] = self.reduceTotals(approp);
                summary['expChange'] = expChange;
                summary['appropChange'] = appropChange;
                summary['rowId'] = item.get(view + ' ID');
                summary['type'] = view
                var hierarchy = self.hierarchy[self.topLevelView]
                var ranking = hierarchy.indexOf(view)
                if (ranking == 0){
                    summary['child'] = hierarchy[1];
                    summary['parent_type'] = null;
                } else if(ranking == 1){
                    summary['child'] = hierarchy[2];
                    summary['parent_type'] = hierarchy[0];
                } else if(ranking == 2) {
                    summary['child'] = null;
                    summary['parent_type'] = hierarchy[1];
                }
                if(summary['parent_type']){
                    summary['parent'] = self.mainChartData.get('title')
                }
                summary['slug'] = item.get(view)
                    .replace("'", "")
                    .replace("&", "")
                    .replace(")", "")
                    .replace("(", "")
                    .split(' ')
                    .join('-');
            });
            if (typeof summary['expenditures'] !== 'undefined'){
                return summary
            } else {
                return null
            }
        }
    });

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
            this.model.on('change', function(model){
                if(!model.get('appropChange')){
                    $('.main-approp').hide();
                } else {
                    $('.main-approp').show();
                }
                if(!model.get('expChange')){
                    $('.main-exp').hide();
                } else {
                    $('.main-exp').show();
                }
            });
        },
        updateCrumbs: function(){
            var links = ['<a href="/">Macoupin County</a>'];
            if(Backbone.history.fragment){
                var parts = Backbone.history.fragment.split('/');
                var crumbs = parts.slice(1, parts.length);
                $.each(crumbs, function(i, crumb){
                    var link = '<a href="#' + parts.slice(0,i+2).join('/') + '">';
                    link += crumb.split('-').join(' ');
                    link += '</a>';
                    links.push(link);
                });
            }
            $('#breadcrumbs').html(links.join(' > '));
        },
        // This is where the magic happens. Grab the template from the template_cache function
        // at the top of this file and then update the chart with what's passed in as the model.
        render: function(){
            this.$el.html(template_cache('mainChart', {model: this.model}));
            this._modelBinder.bind(this.model, this.el, {
                viewYear: '.viewYear',
                prevYear: '.prevYear',
                selectedExp: '.expenditures',
                selectedApprop: '.appropriations',
                expChange: '.expChange',
                appropChange: '.appropChange'
            });
            this.updateChart(this.model, this.model.viewYear);
            return this;
        },
        updateChart: function(data, year){
            if (typeof this.highChart !== 'undefined'){
                delete this.highChart;
            }
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
            this.highChart = new Highcharts.Chart(this.chartOpts);
        },
        pointClick: function(e){
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
            collection.updateYear(clickedYear, yearIndex);
        },
        breakIt: function(e){
            e.preventDefault();
            var view = $(e.currentTarget).data('choice');
            app_router.navigate('/');
            collection.updateTables(view, 'Macoupin County Budget');
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
            var self = this;
            this.model.on('change', function(model){
                var sel = '#' + model.get('slug') + '-selected-chart';
                if(!model.get('appropChange')){
                    $(sel).parent().find('.sparkline-budgeted').hide();
                } else {
                    $(sel).parent().find('.sparkline-budgeted').show();
                }
                if(!model.get('expChange')){
                    $(sel).parent().find('.sparkline-spent').hide();
                } else {
                    $(sel).parent().find('.sparkline-spent').show();
                }
            });
        },
        render: function(){
            this.model.set({maxNum: this.attributes.maxNum})
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
            if (typeof this.detailView !== 'undefined'){
                this.detailView.undelegateEvents();
            }
            if (this.detailShowing){
                this.$el.next().remove();
                this.$el.find('img').attr('src', 'images/expand.png')
                this.detailShowing = false;
            } else {
                var row = $(e.currentTarget).parent().parent();
                $.each(row.parent().find('img'), function(i,img){
                    $(img).attr('src', 'images/expand.png');
                })
                var filter = {}
                var type = this.model.get('type');
                filter[type] = this.model.get('rowName');
                var parent_type = this.model.get('parent_type');
                filter[parent_type] = this.model.get('parent');
                var expenditures = [];
                var appropriations = [];
                $.each(collection.getYearRange(), function(i, year){
                    var exp = collection.getChartTotals('Expenditures', filter, year);
                    expenditures.push(collection.reduceTotals(exp));
                    var approp = collection.getChartTotals('Appropriations', filter, year);
                    appropriations.push(collection.reduceTotals(approp));
                });
                this.model.allExpenditures = expenditures;
                this.model.allAppropriations = appropriations;
                this.detailView = new app.BreakdownDetail({model:this.model});
                this.detailView.render().$el.insertAfter(this.$el);
                this.detailView.updateChart();
                this.detailShowing = true;
                this.$el.find('img').attr('src', 'images/collapse.png')
            }
        },
    })

    app.BreakdownDetail = Backbone.View.extend({
        tagName: 'tr',
        className: 'expanded-content',
        chartOpts: window.sparkLineOpts,

        events: {
            'click .breakdown': 'breakdownNav'
        },
        initialize: function(){
            this._modelBinder = new Backbone.ModelBinder();
        },
        render: function(){
            this.$el.html(template_cache('breakdownDetail', {model: this.model}));
            this._modelBinder.bind(this.model, this.el, {
                prevYear: '.prevYear',
                expChange: '.expChange',
                appropChange: '.appropChange'
            });
            return this;
        },

        breakdownNav: function(e){
            var filter = {}
            var topLevelView = this.model.get('type')
            filter[topLevelView] = this.model.get('rowName')
            var path = this.model.get('slug');
            if (this.model.get('parent')){
                var hierarchy = collection.hierarchy[collection.topLevelView]
                var type_pos = hierarchy.indexOf(topLevelView)
                var parent_type = hierarchy[type_pos - 1];
                filter[parent_type] = this.model.get('parent');
                path = this.model.get('parent').split(' ').join('-') + '/' + this.model.get('slug')
            }
            collection.updateTables(this.model.get('child'), this.model.get('rowName'), filter);
            document.title = document.title + ' | ' + this.model.get('rowName');
            $('#secondary-title').text(this.model.get('child'));
            var pathStart = null;
            if(topLevelView == 'Fund'){
                pathStart = 'fund-detail/';
            } else {
                pathStart = 'control-officer-detail/';
            }
            app_router.navigate(pathStart + path);
            collection.mainChartView.updateCrumbs();
        },

        updateChart: function(){
            if (typeof this.highChart !== 'undefined'){
                delete this.highChart;
            }
            var data = this.model;
            var minValuesArray = $.grep(data.allAppropriations.concat(data.allExpenditures),
              function(val) { return val != null; });
            var globalOpts = app.GlobalChartOpts;
            this.chartOpts.chart.renderTo = data.get('slug') + "-selected-chart";
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
            this.highChart = new Highcharts.Chart(this.chartOpts);
        },

        // Handler for the click events on the points on the chart
        pointClick: function(e){
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
            collection.updateYear(clickedYear, yearIndex);
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
        // Maybe the thing to do here is to construct a separate route for
        // the two different top level views. So, fund-detail and control-officer-detail
        // or something. That would require making sure the correct route is
        // triggered when links are clicked. Not impossible but probably cleaner
        routes: {
            "fund-detail/:topName(/:secondName)": "fundDetailRoute",
            "control-officer-detail/:topName(/:secondName)": "controlDetailRoute",
            "": "defaultRoute"
        },
        initialize: function(options){
            this.collection = options.collection;
        },
        defaultRoute: function(actions){
            $('#secondary-title').text('Fund');
            this.collection.bootstrap();
        },
        fundDetailRoute: function(topName, secondName){
            var init = ['Fund']
            var top = topName.split('-').join(' ');
            init.push(top);
            if(secondName){
                var second = secondName.split('-').join(' ');
                init.push(second);
            }
            this.collection.bootstrap(init);
        },
        controlDetailRoute: function(topName, secondName){
            var init = ['Control Officer']
            var top = topName.split('-').join(' ');
            init.push(top);
            if(secondName){
                var second = secondName.split('-').join(' ');
                init.push(second);
            }
            this.collection.bootstrap(init);
        }
    });
    var collection = new app.BudgetColl();
    var app_router = new app.Router({collection: collection});
    Backbone.history.start();
})()
