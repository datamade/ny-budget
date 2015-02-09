(function(){

    app.MainChartModel = Backbone.Model.extend({
        setYear: function(year, index){
            console.log("*** in MainChartModel setYear")
            var exp = this.get('expenditures');
            var approp = this.get('appropriations');
            var expChange = BudgetHelpers.calc_change(exp[index], exp[index - 1]);
            var appropChange = BudgetHelpers.calc_approp_change(approp[index], approp[index - 1], exp[index - 1]);
            this.set({
                'selectedExp': BudgetHelpers.convertToMoney(exp[index]),
                'selectedApprop': BudgetHelpers.convertToMoney(approp[index]),
                'expChange': expChange,
                'appropChange': appropChange,
                'viewYear': year,
                'prevYear': year - 1,
                'viewYearRange': BudgetHelpers.convertYearToRange(year),
                'prevYearRange': BudgetHelpers.convertYearToRange(year-1)
            });
        }
    });

    app.BreakdownRow = Backbone.Model.extend({
        yearIndex: null
    });

    app.BreakdownColl = Backbone.Collection.extend({
        setRows: function(year, index){
            console.log("*** in BreakdownColl setRows")
            var self = this;
            var all_nums = []
            var total_app = 0
            var total_exp = 0
            $.each(this.models, function(i, row){
                var query = {}
                query[row.get('type')] = row.get('rowName')
                console.log("  *** call getSummary in .each this.models")
                var summ = collection.getSummary(row.get('type'), query, year)
                row.set(summ);
                row.yearIndex = index;
                all_nums.push(row.get('appropriations'));
                all_nums.push(row.get('expenditures'));
                total_exp = total_exp + row.get('expenditures')
                total_app = total_app + row.get('appropriations')
            });
            all_nums = all_nums.filter(Boolean);
            this.maxNum = all_nums.sort(function(a,b){return b-a})[0];
            $.each(this.models, function(i, row){

                var apps = row.get('appropriations');
                var exps = row.get('expenditures');
                if (isNaN(apps)){apps = 0};
                if (isNaN(exps)){exps = 0};

                var exp_perc = BudgetHelpers.prettyPercent(exps, total_exp);
                var app_perc = BudgetHelpers.prettyPercent(apps, total_app);

                var app_perc_bar = parseFloat((apps/self.maxNum) * 100) + '%';
                var exp_perc_bar = parseFloat((exps/self.maxNum) * 100) + '%';
                row.set({app_perc_bar:app_perc_bar, exp_perc_bar:exp_perc_bar, app_perc:app_perc, exp_perc:exp_perc});
            });

            // hide column in table if all zeros
            if(isNaN(total_exp)){
                $('.appropriations').show();
                $('.expenditures').hide();
                $('#scorecard-app').show();
                $('#scorecard-exp').hide();
                $('.budgeted').show();
                $('.spent').hide();
            };
            if(isNaN(total_app)){
                $('.expenditures').show();
                $('.appropriations').hide();
                $('#scorecard-exp').show();
                $('#scorecard-app').hide();
                $('.spent').show();
                $('.budgeted').hide();
            };
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
            if(!this.model.get('appropChange')){
                $('.main-approp').hide();
            } else {
                $('.main-approp').show();
            }
            if(!this.model.get('expChange')){
                $('.main-exp').hide();
            } else {
                $('.main-exp').show();
            }
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
                selectedExp: '.expenditures',
                selectedApprop: '.appropriations',
                expChange: '.expChange',
                appropChange: '.appropChange'
            });
            this.updateChart(this.model, this.model.get('viewYear'));
            return this;
        },
        updateChart: function(data, year){
            console.log("*** in MainChartView updateChart")
            if (typeof this.highChart !== 'undefined'){
                delete this.highChart;
            }
            var exps = jQuery.extend(true, [], data.get('expenditures'));
            var approps = jQuery.extend(true, [], data.get('appropriations'));

            if (debugMode == true) {
                console.log('main chart data:')
                console.log(exps);
                console.log(approps);
            }

            var exp = BudgetHelpers.inflationAdjust(exps, inflation_idx, benchmark, startYear);
            var approp = BudgetHelpers.inflationAdjust(approps, inflation_idx, benchmark, startYear);

            var minValuesArray = $.grep(approp.concat(exp),
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
            for (var i = 1; i < approp.length; i++) {
                if (approp[i]!==null && exp[i-1]!==null){
                    extra_point['y']= exp[i-1]
                    approp[i-1] = extra_point
                }
            }
            this.chartOpts.series = [{
                color: globalOpts.apropColor,
                data: approp,
                legendIndex: 2,
                marker: {
                    radius: 6,
                    symbol: globalOpts.apropSymbol
                },
                name: globalOpts.apropTitle
              }, {
                color: globalOpts.expendColor,
                data: exp,
                legendIndex: 1,
                marker: {
                    radius: 6,
                    symbol: globalOpts.expendSybmol
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
                  // // (for when years have both app & exp data)
                  // var s = "<strong>" + year_range + "</strong>";
                  // $.each(this.points, function(i, point) {
                  //   s += "<br /><span style=\"color: " + point.series.color + "\">" + point.series.name + ":</span> $" + Highcharts.numberFormat(point.y, 0);
                  // });
                  
                  // This only takes one series in the tooltip - makes estimate override expenditure if estimate exists
                  // (this is for when app & exp span different years, & is necessary
                  // b/c of the hack to fill in the space between apps & exps)
                    var series_name;
                    $.each(this.points, function(i, point) {
                        s = "<strong>" + year_range + " <span style=\"color: " + point.series.color + "\">" + point.series.name + "</span></strong><br />Real: $" + Highcharts.numberFormat(point.y, 0);
                        series_name = point.series.name;
                    });
                    var unadjusted = {}
                    unadjusted['Actuals'] = BudgetHelpers.unadjustedObj(exps, startYear)
                    unadjusted['Estimates'] = BudgetHelpers.unadjustedObj(approps, startYear)
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
                var exp = accounting.unformat(model.get('expenditures'));
                var approp = accounting.unformat(model.get('appropriations'));
                if((exp + approp) == 0){
                    $(self.el).hide();
                    if($(self.el).next().is(':visible')){
                        $(self.el).next().hide();
                    }
                } else {
                    $(self.el).show();
                }
            });
        },
        render: function(){
            this.$el.html(BudgetHelpers.template_cache('breakdownSummary', {model:this.model}));
            this._modelBinder.bind(this.model, this.el, {
                expenditures: {selector: '[name="expenditures"]', converter: this.moneyChanger},
                appropriations: {selector: '[name="appropriations"]', converter: this.moneyChanger},
                app_perc: {selector: '[name=app_perc]'},
                exp_perc: {selector: '[name=exp_perc]'},
                app_perc_bar: {selector: '[name=app_perc_bar]'},
                exp_perc_bar: {selector: '[name=exp_perc_bar]'}
            });
            return this;
        },
        moneyChanger: function(direction, value){
            return BudgetHelpers.convertToMoney(value);
        },
        details: function(e){
            console.log("*** in BreakdownSummary details")
            e.preventDefault();
            if (typeof this.detailView !== 'undefined'){
                this.detailView.undelegateEvents();
            }
            if (this.$el.next().hasClass('expanded-content')){
                this.$el.next().remove();
                this.$el.find('i').attr('class', 'fa fa-caret-right fa-lg fa-fw')
            } else {
                var filter = {};
                var type = this.model.get('type');
                filter[type] = this.model.get('rowName');
                var parent_type = this.model.get('parent_type');
                if(parent_type){
                    filter[parent_type] = this.model.get('parent');
                }
                var expenditures = [];
                var appropriations = [];
                $.each(collection.getYearRange(), function(i, year){
                    var exps = collection.where(filter)
                    console.log("*** in BreakdownSummary details     calls getChartTotals twice")
                    var exp = collection.getChartTotals(expendTitle, exps, year);
                    if (exp.length > 1){
                        expenditures.push(collection.reduceTotals(exp));
                    } else {
                        expenditures.push(parseFloat(exp[0]));
                    }
                    var apps = collection.where(filter);
                    var approp = collection.getChartTotals(apropTitle, apps, year);
                    if (approp.length > 1){
                        appropriations.push(collection.reduceTotals(approp));
                    } else {
                        appropriations.push(parseFloat(approp[0]));
                    }
                });

                this.model.allExpenditures = expenditures;
                this.model.allAppropriations = appropriations;
                this.detailView = new app.BreakdownDetail({model:this.model});
                this.detailView.render().$el.insertAfter(this.$el);
                this.detailView.updateChart();
                this.$el.find('i').attr('class', 'fa fa-caret-down fa-lg fa-fw')

                sel_chart_slug = "#"+this.model.get('slug') + "-selected-chart"
                if(this.model.get('appropChange') == null){
                    $(sel_chart_slug).parent().find('.sparkline-budgeted').hide()
                }
                else{
                    $(sel_chart_slug).parent().find('.sparkline-budgeted').show()
                }
                if(this.model.get('expChange') == null){
                    $(sel_chart_slug).parent().find(".sparkline-spent").hide()
                }
                else{
                    $(sel_chart_slug).parent().find(".sparkline-spent").show()
                }
            }
        }
    })

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
                expChange: '.expChange',
                appropChange: '.appropChange'
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
            var nom_exps = [];
            var nom_approps = [];
            $.each(data.allExpenditures, function(i, e){
                if (isNaN(e)){
                    e = null;
                }
                nom_exps.push(e);
            })
            $.each(data.allAppropriations, function(i, e){
                if (isNaN(e)){
                    e = null;
                }
                nom_approps.push(e);
            });
            var minValuesArray = $.grep(nom_approps.concat(nom_exps),
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
            this.chartOpts.yAxis.min = Math.min.apply( Math, minValuesArray )
            this.chartOpts.plotOptions.series.point.events.click = this.pointClick;
            this.chartOpts.yAxis.title = {  enabled: true,
                                            text: 'Real dollars ('+benchmark+')' }
            var extra_point = {
                    y: 0,
                    marker: {
                        enabled: false
                    },
                    enableMouseTracking: false
                }

            // adjust for inflation
            exps = BudgetHelpers.inflationAdjust(nom_exps, inflation_idx, benchmark, startYear);
            approps = BudgetHelpers.inflationAdjust(nom_approps, inflation_idx, benchmark, startYear);

            // copy over the last actual value as first estimated value, to fill gap in line
            for (var i = 1; i < approps.length; i++) {
                if (approps[i]!==null && exps[i-1]!==null){
                    extra_point['y']= exps[i-1]
                    approps[i-1] = extra_point
                }
            }

            this.chartOpts.series = [{
                color: globalOpts.apropColor,
                data: approps,
                marker: {
                  radius: 4,
                  symbol: globalOpts.apropSymbol
                },
                name: globalOpts.apropTitle
              }, {
                color: globalOpts.expendColor,
                data: exps,
                marker: {
                  radius: 5,
                  symbol: globalOpts.expendSybmol
                },
                name: globalOpts.expendTitle
              }]

            this.chartOpts.tooltip = {
                borderColor: "#000",
                formatter: function() {
                  year = parseInt(Highcharts.dateFormat("%Y", this.x))
                  var year_range = BudgetHelpers.convertYearToRange(year);
                
                  // // Use this code to display both series in the tooltip
                  // // (for when years have both app & exp data)
                  // var s = "<strong>" + year_range + "</strong>";
                  // $.each(this.points, function(i, point) {
                  //   s += "<br /><span style=\"color: " + point.series.color + "\">" + point.series.name + ":</span> $" + Highcharts.numberFormat(point.y, 0);
                  // });
                  
                  // This only takes one series in the tooltip - makes estimate override expenditure if estimate exists
                  // (this is for when app & exp span different years, & is necessary
                  // b/c of the hack to fill in the space between apps & exps)
                    var series_name;
                    $.each(this.points, function(i, point) {
                        s = "<strong>" + year_range + " <span style=\"color: " + point.series.color + "\">" + point.series.name + "</span></strong><br />Real: $" + Highcharts.numberFormat(point.y, 0);
                        series_name = point.series.name;
                    });
                    var unadjusted = {}
                    unadjusted['Actuals'] = BudgetHelpers.unadjustedObj(nom_exps, startYear)
                    unadjusted['Estimates'] = BudgetHelpers.unadjustedObj(nom_approps, startYear)
                    s+= "<br><span style=\"color:#7e7e7e\">Nominal: "+ BudgetHelpers.convertToMoney(unadjusted[series_name][year])+"</span>"
                    return s;
                },
                shared: true
            }
            // select current year
            var selectedYearIndex = this.model.get('year') - collection.startYear;
            this.highChart = new Highcharts.Chart(this.chartOpts, function(){
                this.series[0].data[selectedYearIndex].select(true, true);
                this.series[1].data[selectedYearIndex].select(true, true);
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

    app.SearchView = Backbone.View.extend({
        el: $('#search-form'),
        initialize: function(){
            console.log("*** in SearchView initialize")
            var search_options = {
                keys: ['Expense Line'],
                threshold: 0.4
            }
            this.Search = new Fuse(collection.toJSON(), search_options);
            this.render();
        },
        events: {
            'click #search': 'engage'
        },
        render: function(){
            console.log("*** in SearchView render")
            this.$el.html(BudgetHelpers.template_cache('search'));
        },
        engage: function(e){
            console.log("*** in SearchView engage")
            e.preventDefault();
            var input = $(e.currentTarget).parent().prev();
            var term = $(input).val();
            var results = this.Search.search(term);
            if (debugMode == true){
                console.log("results");
                console.log(results);
            }
        }
    });

    var collection = new app.BudgetColl();
    var app_router = new app.Router({collection: collection});
    Backbone.history.start();
    $(document).ready(function() {
        $("body").tooltip({ selector: '[data-toggle=tooltip]' });
    });
})()