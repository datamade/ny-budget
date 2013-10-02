(function(){
window.formatAmount =  function(value) {
    if (value >= 1000000000)
      return "$" + value / 1000000000 + "B";
    else if (value >= 1000000)
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
        x: -280,
        y: 20
      },
      plotOptions: {
        area: { fillOpacity: 0.25 },
        series: {
          lineWidth: 5,
          point: {
            events: {}
          },
          shadow: false
        }
      },
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
          marginRight: 0,
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
            shadow: false
          }
        },
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
            formatter: function() { return window.formatAmount(this.value);}
          },
          lineWidth: 1,
          title: { text: null }
        }
      }

})();

