app.MainChartModel = Backbone.Model.extend({
    setYear: function(year, index){
        console.log("*** in MainChartModel setYear")
        var actual = this.get('actuals');
        var est = this.get('estimates');
        var actualChange = BudgetHelpers.calc_change(actual[index], actual[index - 1]);
        var estChange = BudgetHelpers.calc_est_change(est[index], est[index - 1], actual[index - 1]);
        this.set({
            'selectedActual': BudgetHelpers.convertToMoney(actual[index]),
            'selectedEst': BudgetHelpers.convertToMoney(est[index]),
            'actualChange': actualChange,
            'estChange': estChange,
            'viewYear': year,
            'prevYear': year - 1,
            'viewYearRange': BudgetHelpers.convertYearToRange(year),
            'prevYearRange': BudgetHelpers.convertYearToRange(year-1)
        });
    }
});