app.BudgetColl = Backbone.Collection.extend({
    startYear: startYear,
    endYear: endYear,
    activeYear: activeYear,
    updateYear: function(year, yearIndex){
        console.log("*** in BudgetColl updateYear")
        var expanded = [];
        $.each($('tr.expanded-content'), function(i, row){
            var name = $(row).prev().find('a.rowName').text();
            expanded.push(name);
            $(row).remove();
        })
        this.mainChartData.setYear(year, yearIndex);
        this.breakdownChartData.setRows(year, yearIndex);
        this.dataTable.fnDestroy();
        this.initDataTable();
        this.hideMissing();
        $.each(expanded, function(i, name){
            var sel = 'a.details:contains("' + name + '")';
            $(sel).first().trigger('click');
        })
    },
    updateTables: function(view, title, filter, year){
        console.log("*** in BudgetColl updateTables")
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
        } else {
            this.bdView = view;
        }
        $('#secondary-title').text(this.topLevelView);

        if (typeof year === 'undefined'){
            year = this.activeYear;
        }
        var exp = [];
        var approp = [];
        var self = this;
        var values = this.toJSON();
        if (debugMode == true){
            console.log("Update Tables");
            console.log(this);
        }
        var incomingFilter = false;
        if (typeof filter !== 'undefined'){
            values = _.where(this.toJSON(), filter);
            incomingFilter = true;
        }
        var yearRange = this.getYearRange()
        //loop through years in range & get estimated & actual values for line chart
        $.each(yearRange, function(i, year){
            exp_col_name = BudgetHelpers.getColumnName(year, expendTitle);
            approp_col_name = BudgetHelpers.getColumnName(year, apropTitle);

            exp.push(self.getTotals(values, exp_col_name));
            approp.push(self.getTotals(values, approp_col_name));
        });
        var yearIndex = yearRange.indexOf(parseInt(year))
        var selExp = exp[yearIndex];
        var prevExp = exp[yearIndex - 1];
        var expChange = BudgetHelpers.calc_change(selExp, prevExp);
        var selApprop = approp[yearIndex];
        var prevApprop = approp[yearIndex - 1];
        var appropChange = BudgetHelpers.calc_approp_change(selApprop, prevApprop, prevExp);
        this.mainChartData = new app.MainChartModel({
            expenditures: exp,
            appropriations: approp,
            title: title,
            viewYear: year,
            prevYear: year-1,
            viewYearRange: BudgetHelpers.convertYearToRange(year),
            prevYearRange: BudgetHelpers.convertYearToRange(year-1),
            selectedExp: BudgetHelpers.convertToMoney(selExp),
            selectedApprop: BudgetHelpers.convertToMoney(selApprop),
            // this is the +/- percentage summary below main line chart
            appropChange: appropChange,
            expChange: expChange,
            view: self.topLevelView
        });
        var bd = []
        // chartGuts holds the values of the view (e.g. fund)
        var chartGuts = this.pluck(view).getUnique();
        var all_nums = []
        var total_exp = 0
        var total_app = 0
        $.each(chartGuts, function(i, name){
            if (!incomingFilter){
                filter = {}
            }
            filter[view] = name;
            var summary = self.getSummary(view, filter, year);
            if (summary){
                var row = new app.BreakdownRow(summary);
                bd.push(row);
                all_nums.push(summary['expenditures']);
                all_nums.push(summary['appropriations']);
                total_exp = total_exp + summary['expenditures']
                total_app = total_app + summary['appropriations']
            }
        });

        if (debugMode == true) console.log("all breakdown numbers: " + all_nums);
        all_nums = all_nums.filter(Boolean);
        var maxNum = all_nums.sort(function(a,b){return b-a})[0];
        this.breakdownChartData = new app.BreakdownColl(bd);
        this.breakdownChartData.maxNum = maxNum;
        if (debugMode == true) console.log("max bar chart num: " + maxNum);
        console.log("   *** loop through breakdownChartData.forEach (x13)")
        this.breakdownChartData.forEach(function(row){
            var exps = accounting.unformat(row.get('expenditures'));
            var apps = accounting.unformat(row.get('appropriations'));
            var exp_perc = BudgetHelpers.prettyPercent(exps, total_exp);
            var app_perc = BudgetHelpers.prettyPercent(apps, total_app);
            var exp_perc_bar = parseFloat((exps/maxNum) * 100) + '%';
            var app_perc_bar = parseFloat((apps/maxNum) * 100) + '%';
            row.set({app_perc_bar:app_perc_bar, exp_perc_bar:exp_perc_bar, app_perc:app_perc, exp_perc:exp_perc});
            var rowView = new app.BreakdownSummary({model:row});
            // add all content to the sortable table html
            $('#breakdown-table-body').append(rowView.render().el);
            console.log("   *** in loop, initialize & render BreakdownSummary")
        });
        console.log("   *** loop through breakdownChartData.forEach finish")

        this.mainChartView = new app.MainChartView({
            model: self.mainChartData
        });
        this.initDataTable();
        this.hideMissing();
    },
    initDataTable: function(){
        console.log("*** in BudgetColl initDataTable")
        var sort_col = 3
        if (this.mainChartData.get('selectedApprop')){
            sort_col = 1
        };
        this.dataTable = $("#breakdown").dataTable({
            "aaSorting": [[sort_col, "desc"]],
            "aoColumns": [
                null,
                {'sType': 'currency'},
                {'sType': 'currency'},
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
    bootstrap: function(init, year){
        console.log("*** in BudgetColl bootstrap")
        var self = this;
        this.spin('#main-chart', 'large');

        $('#download-button').attr('href', dataSource);
        $.when($.get(dataSource)).then(
            function(data){
                var json = $.csv.toObjects(data);
                if (debugMode == true){
                    console.log("Data source to object");
                    console.log(data);
                }
                var loadit = []
                $.each(json, function(i, j){
                    if (debugMode == true){
                        console.log("Process row");
                        console.log(j);
                    }
    
                    j['Function Slug'] = BudgetHelpers.convertToSlug(j['Function']);
                    j['Agency Slug'] = BudgetHelpers.convertToSlug(j['Agency']);
                    j['Fund Type Slug'] = BudgetHelpers.convertToSlug(j['Fund Type']);
                    j['FP Category Slug'] = BudgetHelpers.convertToSlug(j['FP Category']);
                    j['Fund Slug'] = BudgetHelpers.convertToSlug(j['Fund']);
                    j['Subfund Slug'] = BudgetHelpers.convertToSlug(j['Subfund Name']);
                    for (var key in j) {
                        if (key.match("Estimates$") || key.match("Actuals$")){
                            j[key] = BudgetHelpers.tryParse(j[key])
                        }
                    }

                    loadit.push(j)
                });
                self.reset(loadit);
                if (debugMode == true){
                    console.log("Reset loadit");
                    console.log(loadit);
                }
                self.hierarchy = {
                    "Function": ['Function', 'Agency'],
                    "Fund Type": ['Fund Type', 'Fund', 'Subfund Name'],
                    "FP Category": ['FP Category']
                }
                if (typeof init === 'undefined'){
                    self.topLevelView = 'Function';
                    if (!year){
                        year = activeYear;
                    }
                    self.updateTables('Function', municipalityName, undefined, year);
                } else {
                    self.topLevelView = init[0];
                    var lowerView = init[0];
                    var name = init[1];
                    var filter = {}
                    var key = init[0] + ' Slug'
                    filter[key] = name;
                    var title = self.findWhere(filter).get(init[0])

                    if (init.length == 2){
                        lowerView = self.hierarchy[init[0]][1];
                    }
                    // this really only handles hierarchies w/ up to 3 levels (like Fund Type)
                    // tweak this code if there is a drilldown hierarchy w/ more than 3 levels
                    if(init.length > 2){
                        name = init[2];
                        lowerView = self.hierarchy[init[0]][2];
                        key = init[1] + ' Slug'
                        filter[key] = name;
                        //set title?
                        //title = self.findWhere(filter).get('Department');
                    }
                    self.updateTables(lowerView, title, filter, year);
                }
                // self.searchView = new app.SearchView();
            }
        );
    },
    spin: function(element, option){
        console.log("*** in BudgetColl spin")
        // option is either size of spinner or false to cancel it
        $(element).spin(option);
    },
    // Returns an array of valid years.
    getYearRange: function(){
        console.log("*** in BudgetColl getYearRange")
        return Number.range(this.startYear, this.endYear + 1);
    },
    reduceTotals: function(totals){
        return totals.reduce(function(a,b){
          return a + b;
        });
    },


    // Returns a total for a given column name
    getTotals: function(values, col_name){
        var all = _.pluck(values, col_name);
        sum = this.reduceTotals(all)
        return sum;
    },
    getChartTotals: function(category, rows, year){
        var totals = [];
        $.each(rows, function(i, row){
            var col_name = BudgetHelpers.getColumnName(year, category);
            var val = row.get(col_name);
            totals.push(parseInt(val));
        });
        return totals;
    },
    // getSummary is called for each row in chart
    getSummary: function(view, query, year){
        if (typeof year === 'undefined'){
            year = this.activeYear;
        }
        var guts = this.where(query);
        if (guts.length < 1) {
            return null;
        }
        var summary = {};
        var self = this;
        var exp = self.getChartTotals(expendTitle, guts, year);
        var approp = self.getChartTotals(apropTitle, guts, year);
        var prevExp = self.getChartTotals(expendTitle, guts, year - 1);
        var prevApprop = self.getChartTotals(apropTitle, guts, year - 1);
        var expChange = BudgetHelpers.calc_change(self.reduceTotals(exp), self.reduceTotals(prevExp));
        var appropChange = BudgetHelpers.calc_approp_change(self.reduceTotals(approp), self.reduceTotals(prevApprop), self.reduceTotals(prevExp));
        var self = this;
        // get info for each row of the sortable chart
        $.each(guts, function(i, item){
            summary['rowName'] = item.get(view);
            summary['prevYear'] = year - 1;
            summary['prevYearRange'] = BudgetHelpers.convertYearToRange(year-1)
            summary['year'] = year;
            summary['description'] = item.get(view + ' Description');
            summary['expenditures'] = self.reduceTotals(exp);
            summary['appropriations'] = self.reduceTotals(approp);
            summary['expChange'] = expChange;
            summary['appropChange'] = appropChange;
            summary['rowId'] = item.get(view + ' ID');
            summary['type'] = view
            summary['link'] = item.get('Link to Website');
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
            summary['slug'] = item.get(view + ' Slug');
        });
        //console.log("*** in BudgetColl getSummary - END LOOP")
        if (typeof summary['expenditures'] !== 'undefined'){
            return summary
        } else {
            return null
        }
    },
    hideMissing: function(){
        console.log("*** in BudgetColl hideMissing")

        sel_exp = this.mainChartData.get('selectedExp')
        sel_app = this.mainChartData.get('selectedApprop')

        console.log(sel_app)
        if(sel_exp == null){
            $('.expenditures').hide();
            $('#scorecard-exp').hide();
            $('.spent').hide();
        }
        else{
            $('.expenditures').show();
            $('#scorecard-exp').show();
            $('.spent').show();
        }
        if(sel_app == null){
            $('.appropriations').hide();
            $('#scorecard-app').hide();
            $('.budgeted').hide();
        }
        else{
            $('.appropriations').show();
            $('#scorecard-app').show();
            $('.budgeted').show();
        }
    },
});