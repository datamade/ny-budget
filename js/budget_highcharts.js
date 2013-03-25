var BudgetHighcharts = BudgetHighcharts || {};  
var BudgetHighcharts = {  

  pointInterval: 365 * 24 * 3600 * 1000, //one year in ms
  apropColor:   '#13345a',
  apropSymbol:  'circle',
  apropTitle:   'Real (Inflation-adjusted)',
  
  expendColor:  '#405c7d',
  expendSybmol: 'square',
  expendTitle:  'Nominal (Unadjusted)',
  
  //displays main graph using highcharts (http://www.highcharts.com)
  updateMainChart: function() {
    BudgetLib.arraysLoaded++;
    if (BudgetLib.arraysLoaded >= 2) //hack to wait for both expend and approp data callbacks to return
    {
      BudgetLib.arraysLoaded = 0;
      var minValuesArray = $.grep(BudgetLib.appropTotalArray.concat(BudgetLib.expendTotalArray), 
        function(val) { return val != null; });
        
      // Highcharts
      mainChart = new Highcharts.Chart({
      chart: {
        borderColor: "#dddddd",
        borderRadius: 0,
        borderWidth: 1,
        events: {
          click: function() {
            $("#readme").fadeOut("fast");
            $.cookie("budgetbreakdownreadme", "read", { expires: 7 });
          }
        },
        defaultSeriesType: "area",
        marginBottom: 30,
        marginLeft: 60,
        marginRight: 15,
        marginTop: 20,
        renderTo: "timeline-chart"
      },
      credits: { enabled: false },
      legend: {
        backgroundColor: "#ffffff",
        borderColor: "#cccccc",
        floating: true,
        verticalAlign: "top",
        x: -220,
        y: 20
      },
      plotOptions: {
        area: { fillOpacity: 0.25 },
        series: {
          lineWidth: 5,
          point: {
            events: {
              click: function() {
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
                // hack to prevent chart from re-loading while updating the url
                app_router.navigate((BudgetLib.viewMode + '/' + BudgetLib.viewName + '/' + clickedYear + '/' + BudgetLib.viewChart), {trigger: false});
                BudgetLib.updateView(BudgetLib.viewMode, BudgetLib.viewName, clickedYear, BudgetLib.viewChart, false);
              }
            }
          },
          pointInterval: BudgetHighcharts.pointInterval,
          pointStart: Date.UTC(BudgetLib.startYear, 1, 1),
          shadow: false
        }
      },
      series: [
        {
          color: this.apropColor,
          data: BudgetLib.appropTotalArray,
          marker: {
            radius: 6,
            symbol: this.apropSymbol
          },
          name: this.apropTitle
        }, {
          color: this.expendColor,
          data: BudgetLib.expendTotalArray,
          marker: {
            radius: 6,
            symbol: this.expendSybmol
          },
          name: this.expendTitle
        }
      ],
      title: null,
      tooltip: {
        borderColor: "#000",
        formatter: function() {
          var s = "<strong>" + Highcharts.dateFormat("%Y", this.x) + "</strong>";
          $.each(this.points, function(i, point) {
            s += "<br /><span style=\"color: " + point.series.color + "\">" + point.series.name + ":</span> $" + Highcharts.numberFormat(point.y, 0);
          });
          return s;
        },
        shared: true
      },
      xAxis: {
        dateTimeLabelFormats: { year: "%Y" },
        gridLineColor: "#ddd",
        gridLineWidth: 1,
        type: "datetime"
      },
      yAxis: {
        gridLineColor: "#ddd",
        lineWidth: 1,
        labels: {
          formatter: function() { return BudgetHighcharts.formatAmount(this.value); }
        },
        min: Math.min.apply( Math, minValuesArray ),
        title: null
      }
    });
    //select the current year on load
    var selectedYearIndex = BudgetLib.viewYear - BudgetLib.startYear;
    if (mainChart.series[0].data[selectedYearIndex].y != null)
      mainChart.series[0].data[selectedYearIndex].select(true,true);
    if (mainChart.series[1].data[selectedYearIndex].y != null)
      mainChart.series[1].data[selectedYearIndex].select(true,true);
    }
  },
    
  //displays detail sparkling using high charts (http://www.highcharts.com)
  updateSparkline: function() {
    BudgetLib.arraysLoaded++;
     if (BudgetLib.arraysLoaded >= 2)
     {
       var minValuesArray = $.grep(BudgetLib.sparkAppropTotalArray.concat(BudgetLib.sparkExpendTotalArray), function(val) { return val != null; });
       BudgetLib.arraysLoaded = 0;
      // Small chart
      BudgetLib.sparkChart = new Highcharts.Chart({
        chart: {
          defaultSeriesType: "area",
          marginBottom: 15,
          marginRight: 0,
          renderTo: "selected-chart"
        },
        legend: { enabled: false },
        credits: { enabled: false },
        plotOptions: {
          area: { fillOpacity: 0.25 },
          series: {
            lineWidth: 2,
            pointInterval: BudgetHighcharts.pointInterval,
            pointStart: Date.UTC(BudgetLib.startYear, 1, 1),
            shadow: false
          }
        },
        series: [
          {
            color: this.apropColor,
            data: BudgetLib.sparkAppropTotalArray,
            marker: {
              radius: 4,
              symbol: this.apropSymbol
            },
            name: this.apropTitle
          }, {
            color: this.expendColor,
            data: BudgetLib.sparkExpendTotalArray,
            marker: {
              radius: 5,
              symbol: this.expendSybmol
            },
            name: this.expendTitle
          }
        ],
        title: null,
        tooltip: {
          borderColor: "#000",
          formatter: function() {
            var s = "<strong>" + Highcharts.dateFormat("%Y", this.x) + "</strong>";
            $.each(this.points, function(i, point) {
              s += "<br /><span style=\"color: " + point.series.color + "\">" + point.series.name + ":</span> $" + Highcharts.numberFormat(point.y, 0);
            });
            return s;
          },
          shared: true
        },
        xAxis: {
          dateTimeLabelFormats: { year: "%Y" },
          gridLineWidth: 0,
          type: "datetime"
        },
        yAxis: {
          gridLineWidth: 0,
          labels: {
            formatter: function() { return BudgetHighcharts.formatAmount(this.value);}
          },
          lineWidth: 1,
          min: Math.min.apply( Math, minValuesArray ),
          title: { text: null }
        }
      });
    var selectedYearIndex = BudgetLib.viewYear - BudgetLib.startYear;
    if (BudgetLib.sparkChart.series[0].data[selectedYearIndex].y != null)
      BudgetLib.sparkChart.series[0].data[selectedYearIndex].select(true,true);
    if (BudgetLib.sparkChart.series[1].data[selectedYearIndex].y != null)
      BudgetLib.sparkChart.series[1].data[selectedYearIndex].select(true,true);
    }
  },

  updatePie: function(element, pieData, sliceTitle) {

    // ensure pie data is sorted by y value
    pieData.sort(function (a, b) {
        if (a['y'] < b['y']) return 1;
        if (b['y'] < a['y']) return -1;
        return 0;
    });

    return new Highcharts.Chart({
        chart: {
            renderTo: element,
            plotBackgroundColor: null,
            plotBorderWidth: null,
            plotShadow: false
        },
        credits: { 
          enabled: false 
        },
        title: {
            text: null
        },
        tooltip: {
            formatter: function() {
                return "<b>" + this.point.name + "</b>\
                <br />$" + Highcharts.numberFormat(this.point.y, 0) + "\
                <br />" + this.percentage.toFixed(2) + "%\
                </p>";
            }
        },
        plotOptions: {
            pie: {
                allowPointSelect: true,
                cursor: 'pointer',
                dataLabels: {
                    enabled: true,
                    color: '#000000',
                    connectorColor: '#000000',
                    formatter: function() {
                        return '<b>'+ this.point.name +'</b>: ' + this.percentage.toFixed(2) + '%';
                    }
                }
            }
        },
        series: [{
            type: 'pie',
            name: sliceTitle,
            data: pieData
        }]
    });
  },
  
  formatAmount: function(value) {
    if (value >= 1000000000)
      return "$" + value / 1000000000 + "B";
    else if (value >= 1000000)
      return "$" + value / 1000000 + "M";
    else
      return "$" + value;
  }
}