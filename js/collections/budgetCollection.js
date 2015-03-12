app.BudgetCollection = Backbone.Collection.extend({
    startYear: startYear,
    endYear: endYear,
    activeYear: activeYear,
    updateYear: function(year, yearIndex){
        var expanded = [];
        $.each($('tr.expanded-content'), function(i, row){
            var name = $(row).prev().find('a.rowName').text();
            expanded.push(name);
            $(row).remove();
        })
        this.mainChartData.setYear(year, yearIndex);
        this.breakdownChartData.setRows(year, yearIndex, this.mainChartData.get('isInflationAdjusted'));
        this.dataTable.fnDestroy();
        this.initDataTable();
        this.hideMissing();
        $.each(expanded, function(i, name){
            var sel = 'a.details:contains("' + name + '")';
            $(sel).first().trigger('click');
        })
    },
    updateTables: function(){
        // view is current hierarchy level
        // title is the title of table, e.g. filter one hierarchy level up, last breakdown clicked
        var url_hash = window.location.hash;
        var url_q = ''
        if(url_hash.indexOf('?') >= 0){
            url_q = url_hash.slice(url_hash.indexOf('?'))
        }
        var url_params = app_router.string2params(url_q)

        year = url_params.year
        if (url_params.figures=='real'){
            isInflationAdjusted = true
        } else{
            isInflationAdjusted = false
        }

        hierarchy_type = url_params.breakdown
        hierarchy_current = this.hierarchy[hierarchy_type]
        this.hierarchy_current = hierarchy_current

        if ( ('filter_1' in url_params) && ('filter_2' in url_params)){
            var f = {}
            f[hierarchy_current[0]+' Slug'] = url_params.filter_1
            f[hierarchy_current[1]+' Slug'] = url_params.filter_2
            prev_title = collection.findWhere(f).get(hierarchy_current[0])
            title = collection.findWhere(f).get(hierarchy_current[1])
            crumb_names = [prev_title, title]
            view = hierarchy_current[2]
        }
        else if ('filter_1' in url_params){
            var f = {}
            f[hierarchy_current[0]+' Slug'] = url_params.filter_1
            title = collection.findWhere(f).get(hierarchy_current[0])
            crumb_names = [title]
            view = hierarchy_current[1]
        }
        else{
            var f = undefined
            title = municipalityName
            if ('breakdown' in url_params){
                view = url_params.breakdown
            }else{
                view = 'Function'
            }
            crumb_names = []
        }

        var expanded = [];
        $.each($('tr.expanded-content'), function(i, row){
            var name = $(row).prev().find('a.rowName').text();
            expanded.push(name);
            $(row).remove();
        })

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

        // set secondary-title text
        //$('#secondary-title').text(    );

        if (typeof year === 'undefined'){
            year = this.activeYear;
        }
        var actual = [];
        var est = [];
        var self = this;
        var values = this.toJSON();
        if (debugMode == true){
            console.log("Update Tables");
            console.log(this);
        }
        var incomingFilter = false;
        if (typeof f !== 'undefined'){
            values = _.where(this.toJSON(), f);
            incomingFilter = true;
        }
        var yearRange = this.getYearRange()
        //loop through years in range & get estimated & actual values for line chart
        $.each(yearRange, function(i, year){
            actual_col_name = BudgetHelpers.getColumnName(year, actualTitle);
            est_col_name = BudgetHelpers.getColumnName(year, estTitle);

            actual.push(self.getTotals(values, actual_col_name));
            est.push(self.getTotals(values, est_col_name));
        });
        var yearIndex = yearRange.indexOf(parseInt(year))

        // this is the data for the summary section
        var sel_actual_sum = actual[yearIndex];
        var prev_actual_sum = actual[yearIndex - 1];
        var sel_est_sum = est[yearIndex]
        var prev_est_sum = est[yearIndex - 1]
        if(isInflationAdjusted){
            sel_actual_sum = BudgetHelpers.inflationAdjust(sel_actual_sum, year, benchmark)
            sel_est_sum = BudgetHelpers.inflationAdjust(sel_est_sum, year, benchmark)
            prev_actual_sum = BudgetHelpers.inflationAdjust(prev_actual_sum, year-1, benchmark)
            prev_est_sum = BudgetHelpers.inflationAdjust(prev_est_sum, year-1, benchmark)
        }

        var actualChange = BudgetHelpers.calc_change(sel_actual_sum, prev_actual_sum);
        var estChange = BudgetHelpers.calc_est_change(sel_actual_sum, prev_est_sum, prev_actual_sum);
        this.mainChartData = new app.MainChartModel({
            actuals: actual,
            estimates: est,
            title: title,
            viewYear: year,
            prevYear: year-1,
            viewYearRange: BudgetHelpers.convertYearToRange(year),
            prevYearRange: BudgetHelpers.convertYearToRange(year-1),
            selectedActual: BudgetHelpers.convertToMoney(sel_actual_sum),
            selectedEst: BudgetHelpers.convertToMoney(sel_est_sum),
            // this is the +/- percentage summary below main line chart
            estChange: estChange,
            actualChange: actualChange,
            view: hierarchy_current[0],
            isInflationAdjusted: isInflationAdjusted,
            showInflationToggle: enable_inflation_toggle,
            filter: f,
            url_params: url_params,
            crumb_names: crumb_names,
            hierarchy_current: hierarchy_current
        });
        var bd = []
        // chartGuts holds the values of the view (e.g. fund)
        var chartGuts = this.pluck(view).getUnique();
        var all_nums = []
        var total_actual = 0
        var total_est = 0
        $.each(chartGuts, function(i, name){
            if (!incomingFilter){
                row_filter = {}
            } else{
                row_filter = self.clone(f)
            }
            row_filter[view] = name;
            var summary = self.getSummary(view, row_filter, year, isInflationAdjusted);
            if (summary){
                if (summary['actuals']>0 || summary['estimates']>0){
                    var row = new app.BreakdownRow(summary);
                    bd.push(row);
                    all_nums.push(summary['actuals']);
                    all_nums.push(summary['estimates']);
                    total_actual = total_actual + summary['actuals']
                    total_est = total_est + summary['estimates']
                }
            }
        });

        if (debugMode == true) console.log("all breakdown numbers: " + all_nums);
        all_nums = all_nums.filter(Boolean);
        var maxNum = all_nums.sort(function(a,b){return b-a})[0];
        this.breakdownChartData = new app.BreakdownCollection(bd);
        this.breakdownChartData.maxNum = maxNum;
        if (debugMode == true) console.log("max bar chart num: " + maxNum);
        // console.log("   *** loop through breakdownChartData.forEach (x13)")
        this.breakdownChartData.forEach(function(row){
            var actuals = accounting.unformat(row.get('actuals'));
            var ests = accounting.unformat(row.get('estimates'));
            var actual_perc = BudgetHelpers.prettyPercent(actuals, total_actual);
            var est_perc = BudgetHelpers.prettyPercent(ests, total_est);
            var actual_perc_bar = parseFloat((actuals/maxNum) * 100) + '%';
            var est_perc_bar = parseFloat((ests/maxNum) * 100) + '%';
            row.set({est_perc_bar:est_perc_bar, actual_perc_bar:actual_perc_bar, est_perc:est_perc, actual_perc:actual_perc, isInflationAdjusted:isInflationAdjusted});
            var rowView = new app.BreakdownSummary({model:row});
            // add all content to the sortable table html
            $('#breakdown-table-body').append(rowView.render().el);
            // console.log("   *** in loop, initialize & render BreakdownSummary")
        });
        // console.log("   *** loop through breakdownChartData.forEach finish")

        this.mainChartView = new app.MainChartView({
            model: self.mainChartData
        });

        this.initDataTable();
        this.hideMissing();

        $.each(expanded, function(i, name){
            var sel = 'a.details:contains("' + name + '")';
            $(sel).first().trigger('click');
        })
    },
    initDataTable: function(){
        var sort_col = 3
        if (this.mainChartData.get('selectedEst')){
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
    bootstrap: function(year, figures){
        var self = this;
        this.spin('#main-chart', 'large');

        if (figures == 'nominal'){
            var isInflationAdjusted = false
        }
        else{
            var isInflationAdjusted = true
        }

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

                self.updateTables();
                // self.searchView = new app.SearchView();
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
    getSummary: function(view, query, year, isInflationAdjusted){
        if (typeof year === 'undefined'){
            year = this.activeYear;
        }
        var guts = this.where(query);
        if (guts.length < 1) {
            return null;
        }
        var summary = {};
        var self = this;

        var actual_sum = self.reduceTotals( self.getChartTotals(actualTitle, guts, year) );
        var est_sum = self.reduceTotals( self.getChartTotals(estTitle, guts, year) );
        var prev_actual_sum = self.reduceTotals( self.getChartTotals(actualTitle, guts, year - 1) );
        var prev_est_sum = self.reduceTotals( self.getChartTotals(estTitle, guts, year - 1) );

        if (isInflationAdjusted){
            actual_sum = BudgetHelpers.inflationAdjust(actual_sum, year, benchmark)
            est_sum = BudgetHelpers.inflationAdjust(est_sum, year, benchmark)
            prev_actual_sum = BudgetHelpers.inflationAdjust(prev_actual_sum, year-1, benchmark)
            prev_est_sum = BudgetHelpers.inflationAdjust(prev_est_sum, year-1, benchmark)
        }

        var actualChange = BudgetHelpers.calc_change( actual_sum, prev_actual_sum );
        var estChange = BudgetHelpers.calc_est_change( est_sum, prev_est_sum, prev_actual_sum);

        // get info for each row of the sortable chart
        $.each(guts, function(i, item){
            summary['rowName'] = item.get(view);
            summary['prevYear'] = year - 1;
            summary['prevYearRange'] = BudgetHelpers.convertYearToRange(year-1)
            summary['year'] = year;
            summary['description'] = item.get(view + ' Description');
            summary['actuals'] = actual_sum
            summary['estimates'] = est_sum
            summary['actualChange'] = actualChange;
            summary['estChange'] = estChange;
            summary['rowId'] = item.get(view + ' ID');
            summary['type'] = view
            summary['link'] = item.get('Link to Website');
            var hierarchy = self.hierarchy_current
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
        if (typeof summary['actuals'] !== 'undefined'){
            return summary
        } else {
            return null
        }
    },
    hideMissing: function(){

        sel_actual = this.mainChartData.get('selectedActual')
        sel_est = this.mainChartData.get('selectedEst')

        if(!sel_actual){
            $('.actuals').hide();
            $('#scorecard-actual').hide();
        }
        else{
            $('.actuals').show();
            $('#scorecard-actual').show();
        }
        if(!sel_est){
            $('.estimates').hide();
            $('#scorecard-est').hide();
        }
        else{
            $('.estimates').show();
            $('#scorecard-est').show();
        }

        actual_change = this.mainChartData.get('actualChange')
        est_change = this.mainChartData.get('estChange')

        if(!est_change){
            $('.main-est').hide();
        } else {
            $('.main-est').show();
        }
        if(!actual_change){
            $('.main-actual').hide();
        } else {
            $('.main-actual').show();
        }
    },
    clone: function(obj) {
        if (null == obj || "object" != typeof obj) return obj;
        var copy = obj.constructor();
        for (var attr in obj) {
            if (obj.hasOwnProperty(attr)) copy[attr] = obj[attr];
        }
        return copy;
    }
});