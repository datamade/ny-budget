(function(){
window.formatAmount =  function(value) {
    if (value >= 1000000000 || value <= -1000000000)
      return "$" + value / 1000000000 + "B";
    else if (value >= 1000000 || value <= -1000000)
      return "$" + value / 1000000 + "M";
    else
      return "$" + value;
  }
window.mainChartOpts = {
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
        marginTop: 20,
        renderTo: "timeline-chart"
      },
      credits: { enabled: false },
      legend: {
        align: "left",
        verticalAlign: "top",
        x: 80,
        y: 10,
        floating: true,
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
        borderColor: "#cccccc"
      },
      plotOptions: {
        area: { fillOpacity: 0.25 },
        series: {
          lineWidth: 5,
          point: {
            events: {}
          },
          shadow: false,
          animation: false
        }
      },
      title: null,
      xAxis: {
        gridLineWidth: 0,
        type: "datetime",
        tickInterval: 365 * 24 * 36e5, // one week
        labels: {
          format: '{value:%Y}'
        }
      },
      yAxis: {
        gridLineColor: "#eee",
        lineWidth: 1,
        labels: {
          formatter: function() { return window.formatAmount(this.value); }
        },
        title: null
      }
    }

  //displays detail sparkling using high charts (http://www.highcharts.com)
window.sparkLineOpts =  {
        chart: {
          defaultSeriesType: "area",
          marginBottom: 15,
          marginRight: 0
        },
        legend: { enabled: false },
        credits: { enabled: false },
        plotOptions: {
          area: { fillOpacity: 0.25 },
          series: {
            lineWidth: 2,
            point: {
              events: {}
            },
            shadow: false,
            animation: false
          }
        },
        title: null,
        xAxis: {
          dateTimeLabelFormats: { year: "%Y" },
          gridLineWidth: 0,
          type: "datetime"
        },
        yAxis: {
          gridLineWidth: 0,
          labels: {
            formatter: function() { return window.formatAmount(this.value);}
          },
          lineWidth: 1,
          title: { text: null }
        }
      }

})();

