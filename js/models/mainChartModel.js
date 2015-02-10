app.MainChartModel = Backbone.Model.extend({
    setYear: function(year, index){
        console.log("*** in MainChartModel setYear")
        var exp = this.get('actuals');
        var est = this.get('estimates');
        var expChange = BudgetHelpers.calc_change(exp[index], exp[index - 1]);
        var estChange = BudgetHelpers.calc_est_change(est[index], est[index - 1], exp[index - 1]);
        this.set({
            'selectedExp': BudgetHelpers.convertToMoney(exp[index]),
            'selectedEst': BudgetHelpers.convertToMoney(est[index]),
            'expChange': expChange,
            'estChange': estChange,
            'viewYear': year,
            'prevYear': year - 1,
            'viewYearRange': BudgetHelpers.convertYearToRange(year),
            'prevYearRange': BudgetHelpers.convertYearToRange(year-1)
        });
    }
});