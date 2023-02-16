# Insight Project framework
A small framework that implements a project concept within a FICO Xpress Insight app.

### Pre-requisites
FICO Xpress Insight 4 support: version 4.59 or later
FICO Xpress Insight 5 support: version 5.3 or later

### Concept
A project is a managed folder in the app root containing a "project scenario" which holds the common project configuration and can implement project scoped logic and operations. The framework provides UI elements and bindings to create, open, rename, delete, import, export, share and clone a project. The framework also implements an optional revision check between project and scenarios with a message shown if a scenario on the shelf has results older than the latest change to the project configuration.
The framework is provided as a reference example based on the "campaign conversion" product example. This version of the example shows how to separate out the data model into project and scenario pieces, and how to implement appropriate views for both.

### Required framework files
Add the project framework CSS, JavaScript and font files to your project
<br /><br />
/client_resources/js/projectframework.js<br />
/client_resources/css/projectframework.css<br />
/client_resources/css/font.css<br />
/client_resources/css/fonts

### Types of view
The framework implements its own shelf validation and messages. The built in shelf validation should be disabled by declaring all views as not requiring scenarios in the companion file.

campaign_conversion.xml:
```xml
<vdl-view title="Setup" path="setup.vdl" empty-selection-default="true" />
```

The following types of view are supported
- A management view which includes the options to add a new view or open an existing project.
- A project view, which views/edits the project configuration.
- A scenario view, which view/edits one or more scenarios (and can also view/edit the project configuration).


### Adding a management view
The management view should be given the id "Manage" in the companion file definition.

```xml
<vdl-view title="Manage Projects" id="Manage" default="true" path="manage.vdl" empty-selection-default="true" />
```

Include the framework files in the management view.

manage.vdl:
```html
 <vdl version="5">
    <link rel="stylesheet" href="css/projectframework.css">
    <link rel="stylesheet" href="css/font.css">
    <script type="text/javascript" src="js/projectframework.js"></script>
```

Initialize the framework. Place the following code in a view specific JS file or script block (the configuration will vary per view):

manage.js:
```js
var projectframework;

insight.ready(function() {
    projectframework = new ProjectFramework(
        {
            viewType: "manage",  // does not require project or scenario validation
            defaultView: 'Data'  // the view that Open Project navigates to
        }
    );
    projectframework.init();
});
```
Make sure this javascript file is included in the VDL view file.

manage.vdl:
```html
 <vdl version="5">
    <link rel="stylesheet" href="css/projectframework.css">
    <link rel="stylesheet" href="css/font.css">
    <script type="text/javascript" src="js/projectframework.js"></script>
    <script type="text/javascript" src="js/manage.js"></script>
```
 
Include the project overlay (similar to the standard execution overlay, used to cover the view during long running project operations like import).

manage.vdl:
```html
 <vdl-page>
        <project-overlay></project-overlay>
```
Take a copy of manage.vdl from the accompanying example app and modify as necessary.  
```

### Adding a project view
To add a view that shows/edits the project configuration, include the following framework files in the project view.

data.vdl:
```html
 <vdl version="5">
    <link rel="stylesheet" href="css/projectframework.css">
    <script type="text/javascript" src="js/projectframework.js"></script>
```

Initialize the framework. Place the following code in a view specific JS file or script block (the configuration will vary per view). "viewType" configuration attribute is set to "project" to indicate the shelf should be validated agaisnt the requirements for a project view (first scenario on the shelf is a project scenario, only one project scenario, all other scenarios must belong to the same project).

data.js:
```js
var projectframework;
insight.ready(function() {
    projectframework = new ProjectFramework(
        {
            viewType: "project",        // requires project validation
            defaultView: 'Data',        // the view that Open Project navigates to
        }
    );
    projectframework.init();
});
```

Include 2 page definitions. One is the template for showing validation messages. The other is your custom view page which will show if validation passes.

data.vdl:
```html
<vdl-page vdl-if="=!projectframework.shelfValid() && projectframework.shelfValidationMessage()">
         <vdl-section layout="fluid" class="centered-alert">
             <vdl-row>
                 <vdl-column size="12">
                     <div class="alert alert-info">
                         <p vdl-text="=projectframework.shelfValidationMessage()"></p>
                     </div>
                 </vdl-column>
             </vdl-row>
         </vdl-section>
 </vdl-page>

 <vdl-page vdl-if="=projectframework.shelfValid()">
    .....
```
The project scenario is the first scenario on the shelf so entity bindings are as normal.

### Adding a scenario view
To add a view that shows/edits the standard scenarios on the shelf (may optionally also include data from the project scenario), include the framework files in the scenario view.

setup.vdl:
```html
 <vdl version="5">
    <link rel="stylesheet" href="css/projectframework.css">
    <script type="text/javascript" src="js/projectframework.js"></script>
```

Initialize the framework. Place the following code in a view specific JS file or script block (the configuration will vary per view). "viewType" configuration attribute is set to "scenario" to indicate the shelf should be validated agaisnt the requirements for a scenario view (passes project validation rules and at least one other scenario on the shelf).

setup.js:
```js
var projectframework;
insight.ready(function() {
    projectframework = new ProjectFramework(
        {
            viewType: "scenario",       // requires project validation
            defaultView: 'Data',        // the view that Open Project navigates to
        }
    );
    projectframework.init();
});
```

Include 2 page definitions. One is the template for showing validation messages. The other is your custom view page which will show if validation passes.

setup.vdl:
```html
<vdl-page vdl-if="=!projectframework.shelfValid() && projectframework.shelfValidationMessage()">
         <vdl-section layout="fluid" class="centered-alert">
             <vdl-row>
                 <vdl-column size="12">
                     <div class="alert alert-info">
                         <p vdl-text="=projectframework.shelfValidationMessage()"></p>
                     </div>
                 </vdl-column>
             </vdl-row>
         </vdl-section>
 </vdl-page>

 <vdl-page vdl-if="=projectframework.shelfValid()">
    .....
```

The project scenario is always the first scenario (position zero) on the shelf. The standard scenarios are position 1 onwards on the shelf. This means that every UI element that is bound to a standard scenario must set its scenarioid attribute to a number greater than 0. For a single scenario view, this would always be 1.
Multi-scenario views should combine any repeat over scenarios with a conditional test to exclude the project scenario e.g.

setup.vdl:
```html
<vdl-chart>
	<vdl-chart-series entity="metriccontactperchannel" 
		vdl-repeat="=s,i in scenarios" 
		scenario="=i" 
		vdl-if="=s.props.scenarioType !== 'PROJECT'">
	</vdl-chart-series>
</vdl-chart>
```

### Project revision tracking

Project configuration changes may cause scenario results to be considered out of date. The framework includes a feature for tracking the consistency of a sceanrio to the project configuration.

Include an entity "ProjectRevision" in the scenario schema:

project.mos
```
!@insight.hidden true
!@insight.update.afterexecution true
ProjectRevision: integer
```

In the initialization code for a project view, specify the list of project entities that should invalidate scenarios if changed.

```js
var projectframework;
insight.ready(function() {
    projectframework = new ProjectFramework(
        {
            viewType: "project",        // requires project validation
            defaultView: 'Data',        // the view that Open Project navigates to
            projectEntities: [          // list of entities that if edited should increment the project revision
                "CustomerName",
                "ConversionValue",
                "CustomerPropensity",
                "RatioBalance"
            ]
        }
    );
    projectframework.init();
});
```

A scenario should copy the project scenarios ProjectRevision value into its own on execution. 

Include the following VDL to show a message to the end user when the scenario ProjectRevision doesnt match the ProjectRevision of the project. 

```html
 <vdl-section class="centered-alert" layout="fluid" vdl-if="=projectframework.projectRevisionMessage()">
    <vdl-row>
        <vdl-column size="12">
            <div class="alert alert-info">
                <p vdl-text="=projectframework.projectRevisionMessage()"></p>
            </div>
        </vdl-column>
    </vdl-row>
</vdl-section>
```


### Extra details

Folders in the root of the app with names beginning with an underscore character are ignored.

A valid project name is any string of at least one character which does not begin with an underscore character.

projectEntities can be set to ["all"] such that any project entity change increments the ProjectRevision. However be aware that this has scalability implications as all the project entities will be loaded and obserbed by the view.

Additional configuration attributes that can be passed to the ProjectFramework constructor.

```js
config: {
            projectScenarioType: "PROJECT",             // custom scenario type id for project scenario type
            defaultView: '',                            // the view that Open Project navigates to,
            manageView: "Manage",                       // the id of the management view
            viewType: "",                               // type of the current view. project | scenario. Any other value means neither 
            projectEntities: [],                        // list of project entities that impact the project revision for the current view. "all" or [entity names]
            projectRevisionEntity: "ProjectRevision",   // the entity storing the project revision
            projectAttributes: []                       // List of project entities that will be fetched as extra information available for the project list in the management view
        }
```

### Unit tests

Unit tests for the dashboard framework are implemented as Jasmine specs and can be executed by opening test/run.html.

### Known issues

- Project and scenario views that bind explicitly to a given scenario number on the shelf will throw errors to the console when the shelf has less scenarios than required. A product defect causes the bindings to be evaluated even if surrounded by a vdl-if which evaluates to false. The impact of the errors can be mitigated by using an expression i.e. scenario="=1" rather than scenario="1" but they stil appear.

### Licensing

Font icons used in this example:  
    Copyright (c) 2015 - 2020 IcoFont   
    https://icofont.com/license/  

All other content:  
(c) Copyright 2023 Fair Isaac Corporation  

    Licensed under the Apache License, Version 2.0 (the "License");
    you may not use this file except in compliance with the License.
    You may obtain a copy of the License at
      http://www.apache.org/licenses/LICENSE-2.0
    Unless required by applicable law or agreed to in writing, software
    distributed under the License is distributed on an "AS IS" BASIS,
    WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
    See the License for the specific language governing permissions and
    limitations under the License.
