/*
    Insight project framework

    Framework for implementing Insight projects

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
*/
/* global ProjectFramework */
/* global VDL */

var projectframework = new ProjectFramework(
    {
        viewType: "manage",  // does not require project or scenario validation
        defaultView: 'Data', // the view that Open Project navigates to
        projectAttributes: ['Scalar1', 'Scalar2', 'Scalar3']
    }
);

// an observable we are going to use to hold back the page content rendering until we are ready
var ready = VDL.createVariable("ready");
ready(false);

insight.ready(function() {
    projectframework.init()
        .then(projects => {
            // wait for the list of projects to be fetched 
            
            // and then do something with the information
            // insight.getView().showInfoMessage("There are " + projects.length + " projects");

            // or here you could also automatically find and open a project instead of showing the page content
            // projectframework.openProject(projects[0].id)
            
            // or, just show the management view page content
            ready(true);
        })
        .catch(err => {
            ready(true); // show what we have anyway
            insight.getView().showErrorMessage(err);
        });
});
