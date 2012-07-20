(function(window){

  var urls = {
    base: "http://hl7connect.healthintersections.com.au/svc/fhir",
    lab_feed: "/labreport/search.xml?patient.subject.id={personId}&format=application/json",
    patient: "/person/@{personId}?format=application/json"
  },
  m = JSONSelect.match;

  window.extractData = function() {
    var ret = $.Deferred(),
    lab_feed_url = urls.base + urls.lab_feed,
    patient_url = urls.base + urls.patient,
    labs,
    pt,
    subs = {
      "personId": parseInt(getParameterByName("personId"))
    };

    for (var s in subs) {
      lab_feed_url = lab_feed_url.replace("{"+s+"}", subs[s]);
      patient_url = patient_url.replace("{"+s+"}", subs[s]);
    }

    labs = $.ajax(lab_feed_url, {dataType:'json'});
    pt = $.ajax(patient_url, {dataType:'json'});

    $.when(pt, labs).done(function(patient_result, lab_result){

      var patient = patient_result[0],
      labs = lab_result[0],
      gender = patient.Person.gender.text === 'F' ? "female" : "male",
      dob = new XDate(patient.Person.dob.value),
      age = Math.floor(dob.diffYears(new XDate())),
      officialName = m(':has(.use:val("official"))', patient.Person.names)[0],
      fname = m('.type:val("given")  ~ .value', officialName)[0],
      lname = m('.type:val("family") ~ .value', officialName)[0],

      by_loinc = function(loincs){
        var ret = [];
        $.each(arguments, function(i,l){
          ret = ret.concat(m('.result > :has(.code:val("'+l+'")) ', labs));
        });
        return ret;
      };

      var hscrp = by_loinc("30522-7");
      var cholesterol = by_loinc("14647-2", "2093-3");
      var hdl = by_loinc("2085-9");

      p = defaultPatient();
      p.birthday = {value:dob};
      p.age = {value:age};
      p.gender={value:gender};
      p.givenName={value:fname};
      p.familyName={value:lname};
      p.hsCRP={value:hscrp_in_mg_per_l(hscrp[0])};
      p.cholesterol={value:cholesterol_in_mg_per_dl(cholesterol[0])};
      p.HDL={value:cholesterol_in_mg_per_dl(hdl[0])};
      p.LDL = {value:p.cholesterol.value-p.HDL.value};

      ret.resolve(p);
    });
    return ret.promise();
  };

  function defaultPatient(){
    return {
      sbp: {value: 120},
      smoker_p: {value: false},
      fx_of_mi_p: {value: false}
    }
  };

  cholesterol_in_mg_per_dl = function(v){
    if (v.valueQuantity.units === "mg/dL"){
      return parseFloat(v.valueQuantity.value);
    }
    else if (v.valueQuantity.units === "mmol/L"){
      return parseFloat(v.valueQuantity.value)/ 0.026;
    }

    throw "Unanticipated cholesterol units: " + v.valueQuantity.units;
  };

  hscrp_in_mg_per_l = function(v){
    if (v.valueQuantity.units === "mg/L"){
      return parseFloat(v.valueQuantity.value);
    }
    throw "Unanticipated hsCRP units: " + v.valueQuantity.units;
  };


  function getParameterByName(name)
  {
    name = name.replace(/[\[]/, "\\\[").replace(/[\]]/, "\\\]");
    var regexS = "[\\?&]" + name + "=([^&#]*)";
    var regex = new RegExp(regexS);
    var results = regex.exec(window.location.search);
    if(results == null)
      return "";
    else
      return decodeURIComponent(results[1].replace(/\+/g, " "));
  }
})(window);
