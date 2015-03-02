app.MainChartModel = Backbone.Model.extend({
    setYear: function(year, index){
        // console.log("*** in MainChartModel setYear")
        var actuals = this.get('actuals');
        var ests = this.get('estimates');

        // these are the values that will be displayed in summary section
        var sel_actual_sum = actuals[index]
        var sel_est_sum = ests[index]
        var prev_actual_sum = actuals[index-1]
        var prev_est_sum = ests[index-1]
        if(this.get('isInflationAdjusted')){
            sel_actual_sum = BudgetHelpers.inflationAdjust(sel_actual_sum, year, benchmark)
            sel_est_sum = BudgetHelpers.inflationAdjust(sel_est_sum, year, benchmark)
            prev_actual_sum = BudgetHelpers.inflationAdjust(prev_actual_sum, year-1, benchmark)
            prev_est_sum = BudgetHelpers.inflationAdjust(prev_est_sum, year-1, benchmark)
        }
        var actualChange = BudgetHelpers.calc_change(sel_actual_sum, prev_actual_sum);
        var estChange = BudgetHelpers.calc_est_change(sel_est_sum, prev_est_sum, prev_actual_sum);
        this.set({
            'selectedActual': BudgetHelpers.convertToMoney(sel_actual_sum),
            'selectedEst': BudgetHelpers.convertToMoney(sel_est_sum),
            'actualChange': actualChange,
            'estChange': estChange,
            'viewYear': year,
            'prevYear': year - 1,
            'viewYearRange': BudgetHelpers.convertYearToRange(year),
            'prevYearRange': BudgetHelpers.convertYearToRange(year-1)
        });
    }
});